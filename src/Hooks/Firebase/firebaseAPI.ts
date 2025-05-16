import {
    collection,
    doc,
    getDoc,
    getDocs,
} from 'firebase/firestore';
import { ref, getDownloadURL } from 'firebase/storage';
import { ref as dbRef, get } from 'firebase/database';
import { db, dbRealTime, dbStorage } from '../../../firebase';

interface FirestoreGetParams {
    collectionPath: string;
    docId?: string; // Opcional - se não fornecido, busca toda a coleção
}

interface RealtimeGetParams {
    path: string;
}

interface StorageGetParams {
    filePath: string;
}

export const FirestoreGet = async (
    params: FirestoreGetParams
): Promise<any> => {
    try {
        const firestore = db();
        const { collectionPath, docId } = params;

        if (docId) {
            // Buscar um documento específico
            const docRef = doc(firestore, collectionPath, docId);
            const docSnap = await getDoc(docRef);
            return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
        } else {
            // Buscar toda a coleção
            const querySnapshot = await getDocs(collection(firestore, collectionPath));
            return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        }
    } catch (error) {
        console.error('Erro no FirestoreGet:', error);
        throw error;
    }
};

export const RealtimeGet = async (
    params: RealtimeGetParams
): Promise<any> => {
    try {
        const database = dbRealTime();
        const { path } = params;

        const snapshot = await get(dbRef(database, path));
        return snapshot.val();
    } catch (error) {
        console.error('Erro no RealtimeGet:', error);
        throw error;
    }
};

export const StorageGet = async (
    params: StorageGetParams
): Promise<string> => {
    try {
        const storage = dbStorage();
        const { filePath } = params;

        return await getDownloadURL(ref(storage, filePath));
    } catch (error) {
        console.error('Erro no StorageGet:', error);
        throw error;
    }
};