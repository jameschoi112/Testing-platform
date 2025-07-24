const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { spawn } = require('child_process');
const fs = require('fs/promises');
const admin = require('firebase-admin');

// Firebase Admin 초기화 개선
let app;
try {
  // 이미 초기화된 앱이 있는지 확인
  app = admin.app();
} catch (error) {
  // 서비스 계정 키 파일 경로 확인
  const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  console.log('Service account path:', serviceAccountPath);

  if (!serviceAccountPath) {
    console.error('GOOGLE_APPLICATION_CREDENTIALS 환경변수가 설정되지 않았습니다.');
    process.exit(1);
  }

  // 파일 존재 여부 확인
  try {
    require('fs').accessSync(serviceAccountPath);
    console.log('Service account file found');
  } catch (err) {
    console.error('Service account file not found:', serviceAccountPath);
    process.exit(1);
  }

  app = admin.initializeApp({
    credential: admin.credential.cert(serviceAccountPath),
    storageBucket: process.env.REACT_APP_STORAGE_BUCKET
  });
}

const db = admin.firestore();
const bucket = admin.storage().bucket();

// Storage bucket 연결 테스트
bucket.exists().then(([exists]) => {
  if (exists) {
    console.log('Firebase Storage bucket connection successful');
  } else {
    console.error('Firebase Storage bucket not found');
  }
}).catch(err => {
  console.error('Firebase Storage connection error:', err.message);
});

const expressApp = express();
const httpServer = createServer(expressApp);
const io = new Server(httpServer, {
  cors: {
    origin: ["http://localhost:3000", "http://10.150.10.160:3000"],
    methods: ["GET", "POST"]
  }
});

const port = 3001;

expressApp.use(cors());
expressApp.use(express.json());

io.on('connection', (socket) => {
  console.log('a user connected:', socket.id);
  socket.on('disconnect', () => {
    console.log('user disconnected:', socket.id);
  });
});

// 스크린샷 저장 함수 개선
async function saveScreenshotToStorage(testId, screenshotBase64, stepIndex) {
  try {
    console.log(`[Server] Starting screenshot save process for test: ${testId}, step: ${stepIndex}`);

    // Base64 데이터 검증
    if (!screenshotBase64 || typeof screenshotBase64 !== 'string') {
      throw new Error('Invalid screenshot data: screenshotBase64 is empty or not a string');
    }

    // Base64 헤더 제거 (data:image/png;base64, 부분이 있다면)
    const base64Data = screenshotBase64.replace(/^data:image\/\w+;base64,/, '');

    if (base64Data.length === 0) {
      throw new Error('Screenshot base64 data is empty after header removal');
    }

    console.log(`[Server] Base64 data length: ${base64Data.length}`);

    // Buffer 생성
    const screenshotBuffer = Buffer.from(base64Data, 'base64');
    console.log(`[Server] Buffer created, size: ${screenshotBuffer.length} bytes`);

    // 파일명 생성
    const timestamp = Date.now();
    const filename = `screenshot-${testId}-step${stepIndex}-${timestamp}.png`;
    const destination = `screenshots/${filename}`;

    console.log(`[Server] Saving to destination: ${destination}`);

    // Firebase Storage에 저장
    const file = bucket.file(destination);

    await file.save(screenshotBuffer, {
      metadata: {
        contentType: 'image/png',
        metadata: {
          testId: testId,
          stepIndex: stepIndex.toString(),
          timestamp: timestamp.toString()
        }
      },
      resumable: false // 작은 파일의 경우 resumable 업로드 비활성화
    });

    console.log(`[Server] Screenshot successfully saved to Firebase Storage: ${destination}`);

    // 공개 URL 생성 (또는 signed URL)
    await file.makePublic(); // 공개 URL을 사용하는 경우
    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${destination}`;

    // 또는 signed URL 사용 (더 안전)
    // const [signedUrl] = await file.getSignedUrl({
    //   action: 'read',
    //   expires: Date.now() + 100 * 365 * 24 * 60 * 60 * 1000 // 100년
    // });

    console.log(`[Server] Public URL generated: ${publicUrl}`);
    return publicUrl;

  } catch (error) {
    console.error(`[Server] Error saving screenshot:`, error);
    throw error;
  }
}

// 스크립트 파일 목록을 가져오는 API
expressApp.get('/api/scripts', async (req, res) => {
  const scriptsDir = path.join(__dirname, 'scripts');
  try {
    const files = await fs.readdir(scriptsDir);
    const scriptFiles = files.filter(file => file.endsWith('.js') || file.endsWith('.spec.js'));
    res.json(scriptFiles);
  } catch (error) {
    console.error('Error reading scripts directory:', error);
    res.status(500).json({ message: '스크립트 폴더를 읽는 중 오류 발생' });
  }
});

expressApp.post('/api/run-test/:testId', async (req, res) => {
  const { testId } = req.params;
  const startTime = Date.now();
  console.log(`Received request to run test: ${testId}`);

  try {
    const testCaseRef = db.collection('testCases').doc(testId);
    const testCaseSnap = await testCaseRef.get();

    if (!testCaseSnap.exists) {
      return res.status(404).json({ message: 'Test case not found' });
    }
    const testCaseData = testCaseSnap.data();
    const { scriptPath } = testCaseData;

    if (!scriptPath) {
      await testCaseRef.update({ status: 'Failed', lastResult: '실행할 스크립트 파일이 지정되지 않았습니다.' });
      return res.status(400).json({ message: '실행할 스크립트 파일이 지정되지 않았습니다.' });
    }

    const originalStepNames = testCaseData.templateSteps || (Array.isArray(testCaseData.steps) ? testCaseData.steps.map(s => s.name) : []);
    const initialSteps = originalStepNames.map(name => ({ name, status: 'Pending', duration: 0, error: null }));
    await testCaseRef.update({ status: 'In Progress', steps: initialSteps, lastRun: admin.firestore.FieldValue.serverTimestamp() });

    res.status(202).json({ message: 'Test execution started' });
    io.emit('test:start', { testId });

    const fullScriptPath = path.join(__dirname, 'scripts', scriptPath);
    const testProcess = spawn('npx', ['playwright', 'test', fullScriptPath, '--headed'], {
      env: {
        ...process.env,
        TARGET_URL: testCaseData.testUrl,
      },
    });

    let accumulatedData = '';
    let errorOutput = '';
    let stepIndex = 0;

    testProcess.stdout.on('data', (data) => {
      accumulatedData += data.toString();
      const reports = accumulatedData.split('__END_OF_JSON__');
      accumulatedData = reports.pop() || '';

      reports.forEach(async (reportStr) => {
        if (!reportStr.trim()) return;

        try {
          console.log(`[Server] Received raw string: "${reportStr}"`);
          const report = JSON.parse(reportStr);
          console.log(`[Server] Parsed report type: ${report.type}`);
          io.emit('test:event', { testId, ...report });

          const testCaseRef = db.collection('testCases').doc(testId);

          if (report.type === 'step:end') {
            const doc = await testCaseRef.get();
            if (!doc.exists) return;
            const steps = doc.data().steps;
            if (stepIndex < steps.length) {
              steps[stepIndex].status = report.payload.status;
              steps[stepIndex].duration = report.payload.duration;
              steps[stepIndex].error = report.payload.error || null;
              await testCaseRef.update({ steps });
              stepIndex++;
            }
          } else if (report.type === 'debug:log') {
            console.log(`[Playwright Debug] ${report.payload.message}`);
          } else if (report.type === 'screenshot:add') {
            console.log('[Server] Processing screenshot:add event...');
            const { failedStepIndex, screenshotBase64 } = report.payload;

            try {
              // 개선된 스크린샷 저장 함수 호출
              const screenshotUrl = await saveScreenshotToStorage(testId, screenshotBase64, failedStepIndex);

              // Firestore에 URL 저장
              const doc = await testCaseRef.get();
              if (!doc.exists) {
                console.error('[Server] Test case document not found');
                return;
              }

              const steps = doc.data().steps;
              if (steps && steps[failedStepIndex]) {
                steps[failedStepIndex].screenshotURL = screenshotUrl;
                await testCaseRef.update({ steps });
                console.log(`[Server] Firestore updated with screenshot URL for step index: ${failedStepIndex}`);
              } else {
                console.error(`[Server] Could not find step at index ${failedStepIndex} in Firestore`);
                console.log('[Server] Available steps:', steps?.map((s, i) => `${i}: ${s.name}`));
              }

            } catch (screenshotError) {
              console.error('[Server] Screenshot processing failed:', screenshotError);
              // 스크린샷 저장 실패해도 테스트는 계속 진행
            }

          } else if (report.type === 'test:end') {
            await testCaseRef.update({
              status: report.payload.status === 'passed' ? 'Completed' : 'Failed',
              duration: report.payload.duration
            });
            io.emit('test:finish', { testId, status: report.payload.status });
          }
        } catch (e) {
          console.error('[Server] Error processing report:', e);
          console.log('[Server] Problematic report string:', reportStr);
        }
      });
    });

    testProcess.stderr.on('data', (data) => {
      errorOutput += data.toString();
      console.error('[Playwright stderr]:', data.toString());
    });

    testProcess.on('close', async (code) => {
      console.log(`[Server] Playwright process exited with code: ${code}`);
      if (code !== 0) {
        console.error(`[Server] Playwright process failed with error: ${errorOutput}`);
        const testCaseRef = db.collection('testCases').doc(testId);
        await testCaseRef.update({ status: 'Failed', lastResult: errorOutput || 'Process exited with non-zero code' });
        io.emit('test:finish', { testId, status: 'Failed' });
      }
    });

  } catch (e) {
    console.error('[Server] Error in run-test process:', e);
    const testCaseRef = db.collection('testCases').doc(testId);
    if (testCaseRef) {
      await testCaseRef.update({ status: 'Failed', lastResult: e.message });
    }
  }
});

httpServer.listen(port, '0.0.0.0', () => {
  console.log(`API server with WebSocket listening at http://0.0.0.0:${port}`);
});