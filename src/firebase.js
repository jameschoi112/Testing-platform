// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, collection, addDoc, query, onSnapshot, orderBy, doc, updateDoc, arrayUnion, where, getDocs } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: process.env.REACT_APP_API_KEY,
  authDomain: process.env.REACT_APP_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_PROJECT_ID,
  storageBucket: process.env.REACT_APP_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_APP_ID,
  measurementId: process.env.REACT_APP_MEASUREMENT_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// 알림 추가
export const addNotification = async (notification) => {
  try {
    await addDoc(collection(db, "notifications"), {
      ...notification,
      createdAt: new Date(),
      readBy: [], // 이 알림을 읽은 사용자 ID 배열
    });
  } catch (e) {
    console.error("Error adding document: ", e);
  }
};

// 모든 알림을 실시간으로 가져오기
export const getNotifications = (callback) => {
  const q = query(collection(db, "notifications"), orderBy("createdAt", "desc"));
  return onSnapshot(q, (querySnapshot) => {
    const notifications = [];
    querySnapshot.forEach((doc) => {
      notifications.push({ id: doc.id, ...doc.data() });
    });
    callback(notifications);
  });
};

// 알림 읽음 처리 (사용자 ID를 readBy 배열에 추가)
export const markNotificationAsRead = async (notificationId, userId) => {
  if (!userId) return;
  const notificationRef = doc(db, "notifications", notificationId);
  await updateDoc(notificationRef, {
    readBy: arrayUnion(userId),
  });
};

// 모든 알림 읽음 처리
export const markAllNotificationsAsRead = async (userId) => {
  if (!userId) return;
  const q = query(
    collection(db, "notifications"),
    where("readBy", "not-in", [[userId]]) // Firestore에서는 not-in 쿼리가 이런 식으로 동작합니다.
                                          // 하지만 이 방법은 완벽하지 않을 수 있습니다.
                                          // 더 나은 방법은 모든 문서를 가져와 클라이언트에서 필터링하는 것입니다.
  );

  // 더 안정적인 방법: 모든 알림을 가져와서 클라이언트에서 필터링 후 업데이트
  const allNotificationsQuery = query(collection(db, "notifications"));
  const querySnapshot = await getDocs(allNotificationsQuery);

  querySnapshot.forEach(async (document) => {
    const data = document.data();
    if (!data.readBy.includes(userId)) {
      const notificationRef = doc(db, "notifications", document.id);
      await updateDoc(notificationRef, {
        readBy: arrayUnion(userId),
      });
    }
  });
};