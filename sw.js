// My Shifts has moved to https://shifts.ra-lab.ch — this mirror is retired.
//
// Kill switch for the old app's service worker (same URL and scope:
// /My-Shift-Public/sw.js, scope /My-Shift-Public/). Browsers fetch this
// file when an installed copy of the old app opens; it takes over at once,
// deletes the old app's offline copy and saved roster, unregisters itself
// and reloads the open windows. They then load the retirement page, which
// also removes the calendar link (localStorage — a service worker cannot
// reach it) and points to the new address.
//
// It only touches this app's data: caches named for this scope and the
// "my-shifts" database, never other sites on ara-brrr.github.io.

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const scope = self.registration.scope // https://ara-brrr.github.io/My-Shift-Public/
      try {
        const names = await caches.keys()
        await Promise.all(names.filter((name) => name.endsWith(scope)).map((name) => caches.delete(name)))
      } catch (e) {
        // Keep going: unregistering matters most.
      }
      try {
        await new Promise((resolve) => {
          const request = indexedDB.deleteDatabase('my-shifts')
          // Blocked while an old page still has it open: the deletion then
          // finishes when that page reloads below.
          request.onsuccess = request.onerror = request.onblocked = () => resolve()
        })
      } catch (e) {
        // The retirement page tries again.
      }
      await self.registration.unregister()
      const windows = await self.clients.matchAll({ type: 'window' })
      for (const client of windows) {
        try {
          await client.navigate(client.url)
        } catch (e) {
          // Not controlled by this worker: it loads the retirement page on its next open.
        }
      }
    })(),
  )
})

// No fetch handler: every request goes straight to the network, which now
// serves only the retirement page.
