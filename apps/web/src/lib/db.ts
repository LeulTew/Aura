import Dexie, { Table } from 'dexie';

export interface PhotoRecord {
  id?: number;
  filename: string;
  thumbnailBlob: Blob;
  fullPath?: string;
  backendId?: string;
  createdAt: Date;
  status: 'pending' | 'synced' | 'error';
  errorDetails?: string;
}

export class AuraDB extends Dexie {
  photos!: Table<PhotoRecord>;

  constructor() {
    super('AuraCache');
    this.version(1).stores({
      photos: '++id, filename, createdAt, status'
    });
  }
}

export const db = new AuraDB();
