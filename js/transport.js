/* Realtime messaging.
   LIVE mode  : Supabase Realtime broadcast (no database tables needed).
   DEMO mode  : BroadcastChannel between tabs of one browser.
   Two channels per room keep traffic low:
     "<room>-down" host → players (game state)
     "<room>-up"   players → host (answers, taps). Players send to it
                   without subscribing, so they never receive each
                   other's messages. */
(function () {
  const cfg = window.TSSI_CONFIG || {};
  const LIVE = !!(cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY && window.supabase);
  let client = null;
  if (LIVE) {
    client = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY, {
      realtime: { params: { eventsPerSecond: 40 } }
    });
  }

  window.TSSI_LIVE = LIVE;
  // config filled in but the Supabase script was blocked (e.g. by a corporate firewall)
  window.TSSI_LIBFAIL = !!(cfg.SUPABASE_URL && !window.supabase);
  window.TSSI_DB = client;

  window.createTransport = function (room, role) {
    const up = "tssi-" + room + "-up";
    const down = "tssi-" + room + "-down";
    const listenName = role === "host" ? up : down;
    const sendName = role === "host" ? down : up;
    const handlers = [];
    const statusHandlers = [];
    const api = {
      live: LIVE,
      onMessage(fn) { handlers.push(fn); },
      onStatus(fn) { statusHandlers.push(fn); },
      send: null
    };
    const deliver = (m) => handlers.forEach((fn) => { try { fn(m); } catch (e) { console.error(e); } });
    const status = (s) => statusHandlers.forEach((fn) => fn(s));

    if (!LIVE) {
      const lc = new BroadcastChannel(listenName);
      const sc = new BroadcastChannel(sendName);
      lc.onmessage = (e) => deliver(e.data);
      api.send = (msg) => { sc.postMessage(msg); return Promise.resolve(); };
      setTimeout(() => status("SUBSCRIBED"), 0);
      return api;
    }

    const lch = client.channel(listenName, { config: { broadcast: { self: false, ack: false } } });
    lch.on("broadcast", { event: "msg" }, (m) => deliver(m.payload));
    lch.subscribe((s) => status(s));

    const sch = client.channel(sendName, { config: { broadcast: { self: false } } });
    if (role === "host") sch.subscribe(); // host pushes state over the websocket
    // players leave the send channel unsubscribed → supabase-js sends via REST

    let useHttp = role === "player" && typeof sch.httpSend === "function";
    api.send = async (msg) => {
      try {
        if (useHttp) {
          const r = await sch.httpSend("msg", msg);
          if (r && r.success !== false) return r;
          console.warn("httpSend failed, falling back", r); useHttp = false;
        }
        return await sch.send({ type: "broadcast", event: "msg", payload: msg });
      } catch (e) {
        if (useHttp) { useHttp = false; return api.send(msg); }
        console.warn("send failed", e);
      }
    };
    return api;
  };
})();
