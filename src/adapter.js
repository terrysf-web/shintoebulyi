// Firebase 연결부. 동기화 로직은 index.html 안의 Sync 객체가 맡고,
// 여기서는 로그인과 저장소 읽기/쓰기만 제공합니다.
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from 'firebase/auth';
import {
  initializeFirestore, persistentLocalCache, persistentMultipleTabManager,
  collection, doc, onSnapshot, writeBatch, waitForPendingWrites,
} from 'firebase/firestore';

function create(config) {
  const app = initializeApp(config);
  const auth = getAuth(app);
  const db = initializeFirestore(app, {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
  });
  return {
    signIn: (email, password) => signInWithEmailAndPassword(auth, email, password),
    signOut: () => signOut(auth),
    onAuth: callback => onAuthStateChanged(auth, callback),
    subscribe(handlers) {
      const stops = [];
      const fail = error => handlers.error && handlers.error(error);
      stops.push(onSnapshot(collection(db, 'tables'), snap => {
        const out = {};
        snap.forEach(d => { out[d.id] = d.data().data; });
        handlers.tables(out);
      }, fail));
      stops.push(onSnapshot(collection(db, 'payments'), snap => {
        const out = {};
        snap.forEach(d => { out[d.id] = d.data().data; });
        handlers.payments(out);
      }, fail));
      if (handlers.tickets) {
        stops.push(onSnapshot(collection(db, 'tickets'), snap => {
          const out = {};
          snap.forEach(d => { out[d.id] = d.data().data; });
          handlers.tickets(out);
        }, fail));
      }
      stops.push(onSnapshot(doc(db, 'config', 'settings'), snap => {
        handlers.settings(snap.exists() ? snap.data().data : null);
      }, fail));
      return () => stops.forEach(stop => stop());
    },
    write({ tables = {}, payments = {}, settings = null, tickets = {} }) {
      const batch = writeBatch(db);
      const now = Date.now();
      for (const [id, data] of Object.entries(tables)) batch.set(doc(db, 'tables', id), { data, updatedAt: now });
      for (const [id, data] of Object.entries(payments)) batch.set(doc(db, 'payments', id), { data, updatedAt: now });
      for (const [id, data] of Object.entries(tickets)) batch.set(doc(db, 'tickets', id), { data, updatedAt: now });
      if (settings !== null) batch.set(doc(db, 'config', 'settings'), { data: settings, updatedAt: now });
      return batch.commit();
    },
    pending: () => waitForPendingWrites(db),
  };
}

window.StbyFirebase = { create };
