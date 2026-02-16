
const CACHE_NAME = 'ovin-manager-pro-v2';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './index.tsx',
  './metadata.json',
  'https://cdn.tailwindcss.com',
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Poppins:wght@600;700;800;900&display=swap',
  'https://cdn-icons-png.flaticon.com/512/1998/1998662.png'
];

// Installation : Mise en cache agressive des ressources critiques
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('OvinPro: Mise en cache des ressources système...');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

// Activation : Nettoyage des anciennes versions pour libérer de l'espace
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  return self.clients.claim();
});

// Stratégie de Fetch : Cache-First pour les assets, Network-Only pour l'IA
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // L'IA Gemini nécessite obligatoirement Internet, on ne tente pas de cache
  if (url.hostname.includes('generativelanguage.googleapis.com')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      
      // Si pas en cache, on tente le réseau et on met en cache si c'est un asset statique
      return fetch(event.request).then((response) => {
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }

        // On ne met pas en cache les réponses dynamiques ou très grosses sans vérification
        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          if (url.protocol.startsWith('http')) {
            cache.put(event.request, responseToCache);
          }
        });

        return response;
      }).catch(() => {
        // Optionnel : Retourner une page d'erreur offline personnalisée ici
      });
    })
  );
});
