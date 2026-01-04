import { openDB } from '../libs/idb.min.js';

export const dbPromise = openDB('data-view-db', 1, {
  upgrade(db) {
    db.createObjectStore('views', { keyPath: 'id' });
  }
});

export async function saveView(view) {
  const db = await dbPromise;
  await db.put('views', view);
}

export async function getAllViews() {
  const db = await dbPromise;
  return await db.getAll('views');
}
