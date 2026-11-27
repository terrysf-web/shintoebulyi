// Firebase 연결부. 동기화 로직은 index.html 안의 Sync 객체가 맡고,
// 여기서는 로그인과 저장소 읽기/쓰기만 제공합니다.
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from 'firebase/auth';
import {
  initializeFirestore, persistentLocalCache, persistentMultipleTabManager, memoryLocalCache,
  collection, doc, onSnapshot, writeBatch, waitForPendingWrites, disableNetwork, enableNetwork,
  query, where, getDocs,
} from 'firebase/firestore';

// 기기마다 시계가 조금씩 달라도 '확인용 조회(poll)'가 놓치지 않도록, 쓰기 시각(updatedAt)은
// 항상 '지금까지 본 가장 늦은 시각'보다 크게 정합니다.
let lastSeen = 0;
const seen = ts => { if (typeof ts === 'number' && ts > lastSeen) lastSeen = ts; };

function create(config, options = {}) {
  const app = initializeApp(config);
  const auth = getAuth(app);
  const db = initializeFirestore(app, {
    // 주방 화면처럼 오프라인 저장이 필요 없는 곳은 메모리만 써서 탭 간 조율 문제를 피합니다.
    localCache: options.memory
      ? memoryLocalCache()
      : persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
    // 식당 Wi-Fi나 Safari에서 실시간 연결이 지연되는 일을 막기 위해 롱폴링을 강제합니다.
    experimentalForceLongPolling: true,
  });
  return {
    signIn: (email, password) => signInWithEmailAndPassword(auth, email, password),
    signOut: () => signOut(auth),
    onAuth: callback => onAuthStateChanged(auth, callback),
    subscribe(handlers) {
      const stops = [];
      const fail = error => handlers.error && handlers.error(error);
      if (handlers.tables) {
        stops.push(onSnapshot(collection(db, 'tables'), snap => {
          const out = {};
          snap.forEach(d => { out[d.id] = d.data().data; seen(d.data().updatedAt); });
          handlers.tables(out);
        }, fail));
      }
      if (handlers.payments) {
        stops.push(onSnapshot(collection(db, 'payments'), snap => {
          const out = {};
          snap.forEach(d => { out[d.id] = d.data().data; seen(d.data().updatedAt); });
          handlers.payments(out);
        }, fail));
      }
      if (handlers.tickets) {
        // 최근 24시간 주문서만 읽어 사용량을 줄입니다.
        const recent = query(collection(db, 'tickets'), where('updatedAt', '>=', Date.now() - 24 * 60 * 60 * 1000));
        stops.push(onSnapshot(recent, snap => {
          const out = {};
          snap.forEach(d => { out[d.id] = d.data().data; seen(d.data().updatedAt); });
          handlers.tickets(out);
        }, fail));
      }
      if (handlers.settings) {
        stops.push(onSnapshot(doc(db, 'config', 'settings'), snap => {
          handlers.settings(snap.exists() ? snap.data().data : null);
        }, fail));
      }
      return () => stops.forEach(stop => stop());
    },
    write({ tables = {}, payments = {}, settings = null, tickets = {} }) {
      const batch = writeBatch(db);
      const now = Math.max(Date.now(), lastSeen + 1);
      seen(now);
      for (const [id, data] of Object.entries(tables)) batch.set(doc(db, 'tables', id), { data, updatedAt: now });
      for (const [id, data] of Object.entries(payments)) batch.set(doc(db, 'payments', id), { data, updatedAt: now });
      for (const [id, data] of Object.entries(tickets)) batch.set(doc(db, 'tickets', id), { data, updatedAt: now });
      if (settings !== null) batch.set(doc(db, 'config', 'settings'), { data: settings, updatedAt: now });
      return batch.commit();
    },
    // 실시간 연결이 멈췄을 때를 대비해, 최근에 바뀐 문서만 서버에서 직접 가져옵니다.
    async poll(kinds, sinceMs) {
      const out = {};
      for (const kind of kinds) {
        const snap = await getDocs(query(collection(db, kind), where('updatedAt', '>=', sinceMs)));
        const map = {};
        let max = 0;
        snap.forEach(d => {
          const v = d.data();
          map[d.id] = v.data;
          seen(v.updatedAt);
          if (v.updatedAt > max) max = v.updatedAt;
        });
        out[kind] = { map, max };
      }
      return out;
    },
    pending: () => waitForPendingWrites(db),
    // 연결을 끊었다가 다시 맺어 실시간 수신을 되살립니다.
    reconnect: async () => { await disableNetwork(db); await enableNetwork(db); },
  };
}

window.StbyFirebase = { create };
