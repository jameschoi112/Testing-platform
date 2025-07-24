const admin = require('firebase-admin');

// Firebase Admin 초기화
try {
  const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!serviceAccountPath) {
    throw new Error('GOOGLE_APPLICATION_CREDENTIALS 환경변수가 설정되지 않았습니다.');
  }
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccountPath),
  });
} catch (e) {
  if (e.code !== 'app/duplicate-app') {
    console.error('Firebase Admin SDK 초기화 실패:', e);
  }
}
const db = admin.firestore();

// 알림 추가 헬퍼 함수
const addNotification = async (notification) => {
  try {
    await db.collection("notifications").add({
      ...notification,
      createdAt: new Date(),
      readBy: [],
    });
  } catch (e) {
    console.error("Error adding notification: ", e);
  }
};


// 재귀적으로 실패한 첫 번째 스텝을 찾는 헬퍼 함수
function findFirstFailedStep(steps, index = { value: 0 }) {
  for (const step of steps) {
    if (step.category === 'test.step') {
      if (step.error) {
        return { step, index: index.value };
      }
      index.value++;
    }
    if (step.steps) {
      const result = findFirstFailedStep(step.steps, index);
      if (result) {
        return result;
      }
    }
  }
  return null;
}

class CustomReporter {
  onTestBegin(test) {
    const report = {
      type: 'test:start',
      payload: {
        title: test.title,
      },
    };
    process.stdout.write(JSON.stringify(report) + '__END_OF_JSON__');

    // 테스트 시작 알림 생성
    const testId = test.title.split('-')[0]?.trim(); // 예: "TEST-001 - 로그인" 에서 "TEST-001" 추출
    const projectName = test.parent.title; // 프로젝트 이름
    
    if (testId) {
        addNotification({
            testId: testId,
            title: `테스트 시작: ${projectName}`,
            message: `[${testId}] 테스트가 정상적으로 시작되었습니다.`,
            type: 'test_start'
        });
    }
  }

  onStepEnd(test, result, step) {
    if (step.category === 'test.step') {
      const report = {
        type: 'step:end',
        payload: {
          title: step.title,
          duration: step.duration,
          status: step.error ? 'failed' : 'passed',
          error: step.error?.message,
        },
      };
      process.stdout.write(JSON.stringify(report) + '__END_OF_JSON__');
    }
  }

  async onTestEnd(test, result) {
    // 테스트 실패 시 스크린샷 캡처 및 전송
    if (result.status === 'failed') {
      const firstFailedStepInfo = findFirstFailedStep(result.steps);

      if (firstFailedStepInfo) {
        const { step, index } = firstFailedStepInfo;

        // 실패한 스텝의 스크린샷 찾기
        const screenshotAttachment = result.attachments.find(
          (a) => a.name === 'screenshot' && a.path
        );

        if (screenshotAttachment && screenshotAttachment.path) {
          try {
            const fs = require('fs/promises');
            const screenshotBuffer = await fs.readFile(screenshotAttachment.path);
            const screenshotBase64 = screenshotBuffer.toString('base64');

            const screenshotReport = {
              type: 'screenshot:add',
              payload: {
                failedStepIndex: index,
                screenshotBase64: screenshotBase64,
              },
            };
            process.stdout.write(JSON.stringify(screenshotReport) + '__END_OF_JSON__');
          } catch (e) {
            const errorReport = {
              type: 'debug:log',
              payload: { message: `[Reporter] Screenshot read error: ${e.message}` },
            };
            process.stdout.write(JSON.stringify(errorReport) + '__END_OF_JSON__');
          }
        }
      }
    }

    const testEndReport = {
      type: 'test:end',
      payload: {
        duration: result.duration,
        status: result.status,
      },
    };
    process.stdout.write(JSON.stringify(testEndReport) + '__END_OF_JSON__');
    
    // 테스트 종료 알림 생성
    const testId = test.title.split('-')[0]?.trim();
    const projectName = test.parent.title;
    const stats = result.steps.reduce((acc, step) => {
        if (step.category !== 'test.step') return acc;
        if (step.error) {
            acc.failed++;
        } else {
            acc.passed++;
        }
        return acc;
    }, { passed: 0, failed: 0 });

    if (testId) {
        addNotification({
            testId: testId,
            title: `테스트 종료: ${projectName}`,
            message: `총 ${stats.passed + stats.failed}개 중 Pass: ${stats.passed}, Fail: ${stats.failed}`,
            type: 'test_end'
        });
    }
  }
}

module.exports = CustomReporter;