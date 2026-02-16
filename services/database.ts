
import { Sheep, HealthRecord, ProductionRecord, ReproductionRecord, NutritionRecord, User, Breeder, IngredientPrice } from "../types";

const DB_NAME = 'OvinManagerDB';
const DB_VERSION = 5; 
const STORES = {
  USERS: 'users',
  BREEDERS: 'breeders',
  PRICES: 'prices',
  SHEEP: 'sheep',
  HEALTH: 'health',
  PRODUCTION: 'production',
  REPRODUCTION: 'reproduction',
  NUTRITION: 'nutrition'
};

const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (e: any) => {
      const dbInstance = e.target.result;
      Object.values(STORES).forEach(store => {
        if (!dbInstance.objectStoreNames.contains(store)) {
          dbInstance.createObjectStore(store, { keyPath: 'id' });
        }
      });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

const getAll = async <T>(storeName: string): Promise<T[]> => {
  const dbInstance = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = dbInstance.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

const putItem = async <T>(storeName: string, item: T): Promise<void> => {
  const dbInstance = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = dbInstance.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.put(item);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

export const db = {
  async createUser(user: User): Promise<void> { await putItem(STORES.USERS, user); },
  async getUserByUsername(username: string): Promise<User | null> {
    const users = await getAll<User>(STORES.USERS);
    return users.find(u => u.username === username) || null;
  },

  async getBreeders(userId: string): Promise<Breeder[]> {
    const all = await getAll<Breeder>(STORES.BREEDERS);
    return all.filter(b => b.userId === userId);
  },
  async saveBreeder(item: Breeder): Promise<void> { await putItem(STORES.BREEDERS, item); },
  async deleteBreeder(id: string): Promise<void> {
    const dbInstance = await openDB();
    const transaction = dbInstance.transaction(STORES.BREEDERS, 'readwrite');
    transaction.objectStore(STORES.BREEDERS).delete(id);
  },

  async getPrices(breederId: string): Promise<IngredientPrice[]> {
    const all = await getAll<IngredientPrice>(STORES.PRICES);
    return all.filter(p => p.breederId === breederId);
  },
  async savePrice(item: IngredientPrice): Promise<void> { await putItem(STORES.PRICES, item); },

  async getSheep(userId: string, breederId?: string): Promise<Sheep[]> {
    const all = await getAll<Sheep>(STORES.SHEEP);
    return all.filter(s => s.userId === userId && (!breederId || s.breederId === breederId));
  },
  async saveSheep(item: Sheep): Promise<void> { await putItem(STORES.SHEEP, item); },
  async deleteSheep(id: string): Promise<void> {
    const dbInstance = await openDB();
    const transaction = dbInstance.transaction(STORES.SHEEP, 'readwrite');
    transaction.objectStore(STORES.SHEEP).delete(id);
  },

  async getProduction(userId: string, breederId?: string): Promise<ProductionRecord[]> {
    const all = await getAll<ProductionRecord>(STORES.PRODUCTION);
    return all.filter(r => r.userId === userId && (!breederId || r.breederId === breederId));
  },
  async addProduction(record: ProductionRecord): Promise<void> { await putItem(STORES.PRODUCTION, record); },

  async getHealth(userId: string, breederId?: string): Promise<HealthRecord[]> {
    const all = await getAll<HealthRecord>(STORES.HEALTH);
    return all.filter(r => r.userId === userId && (!breederId || r.breederId === breederId));
  },
  async addHealth(record: HealthRecord): Promise<void> { await putItem(STORES.HEALTH, record); },

  async getNutrition(userId: string, breederId?: string): Promise<NutritionRecord[]> {
    const all = await getAll<NutritionRecord>(STORES.NUTRITION);
    return all.filter(r => r.userId === userId && (!breederId || r.breederId === breederId));
  },
  async addNutrition(record: NutritionRecord): Promise<void> { await putItem(STORES.NUTRITION, record); },

  async getReproduction(userId: string, breederId?: string): Promise<ReproductionRecord[]> {
    const all = await getAll<ReproductionRecord>(STORES.REPRODUCTION);
    return all.filter(r => r.userId === userId && (!breederId || r.breederId === breederId));
  },
  async addReproduction(record: ReproductionRecord): Promise<void> { await putItem(STORES.REPRODUCTION, record); },

  async importData(jsonData: string): Promise<void> {
    try {
      const data = JSON.parse(jsonData);
      if (data.breeders) for (const b of data.breeders) await this.saveBreeder(b);
      if (data.sheep) for (const s of data.sheep) await this.saveSheep(s);
      if (data.prices) for (const p of data.prices) await this.savePrice(p);
      window.location.reload();
    } catch (e) {
      console.error("Failed to import data", e);
    }
  },

  // Added exportFullBackup method to fix Layout.tsx error
  async exportFullBackup(userId: string): Promise<void> {
    const breeders = await this.getBreeders(userId);
    const sheep = await this.getSheep(userId);
    const allPrices = await getAll<IngredientPrice>(STORES.PRICES);
    const prices = allPrices.filter(p => breeders.some(b => b.id === p.breederId));
    
    const data = {
      breeders,
      sheep,
      prices,
      exportDate: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ovin_backup_${userId}_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
};
