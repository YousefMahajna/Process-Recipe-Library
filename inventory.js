/* Read-only bridge to the existing Adhesive inventory platform. Never writes inventory. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.InventoryBridge = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  var GIST = '32393f1f1f4f7d355049a7102a3e5970';
  var API = 'https://api.github.com/gists/' + GIST;
  var PLATFORM = 'https://yousefmahajna.github.io/lab-adhesives/';
  function text(v) { return v == null ? '' : String(v); }
  function first() { for (var i = 0; i < arguments.length; i++) if (arguments[i] !== undefined && arguments[i] !== null && String(arguments[i]).trim()) return String(arguments[i]); return ''; }
  function safeUrl(v) { try { var u = new URL(v); return u.protocol === 'https:' || u.protocol === 'http:' ? u.href : ''; } catch (e) { return ''; } }
  function safeData(v) { return typeof v === 'string' && /^data:(application\/pdf|image\/(png|jpeg|webp));base64,[A-Za-z0-9+/=\r\n]+$/.test(v) && v.length <= 6000000 ? v : ''; }
  function rawUrl(v) { var u = new URL(v); if (u.protocol !== 'https:' || u.hostname !== 'gist.githubusercontent.com' || !u.pathname.split('/').includes(GIST)) throw new Error('Unexpected inventory file address.'); return u.href; }
  function rows(payload) {
    var list = Array.isArray(payload) ? payload : payload && payload.data;
    if (!Array.isArray(list)) throw new Error('Inventory JSON must contain a data array.');
    var seen = new Set();
    return list.map(function (r, i) {
      if (!r || typeof r !== 'object' || typeof r.name !== 'string' || !r.name.trim()) throw new Error('Invalid inventory material at row ' + (i + 1) + '.');
      var id = text(r.id); if (!id || seen.has(id)) throw new Error('Inventory records must have unique IDs.'); seen.add(id);
      return {
        id: id, name: r.name, pn: first(r.spn, r.supplierPn, r.pn), nvpn: text(r.nvpn), supplier: first(r.vendor, r.supplier),
        potLife: first(r.potLife, r.potlife, r.pot_life), storage: first(r.temp, r.storage), freezer: text(r.freezer), shelf: text(r.shelf),
        datasheet: safeUrl(r.datasheet), dsType: text(r.dsType), dsFileName: text(r.dsFileName), dsFileData: safeData(r.dsFileData),
        expiry: text(r.expiry), owner: text(r.owner), inventoryNotes: text(r.comments), qty: text(r.qty), syringe: text(r.syringe), used: text(r.used)
      };
    });
  }
  function material(row, catalog, attachment) {
    return Object.assign({}, row, { inventoryId: row.id, inventorySource: PLATFORM, inventoryMode: catalog.mode,
      inventoryUpdatedAt: catalog.updatedAt || '', inventoryPulledAt: new Date().toISOString(),
      dsFileData: attachment === undefined ? row.dsFileData : attachment,
      dsStatus: row.dsType === 'file' ? ((attachment || row.dsFileData) ? 'Copied into recipe' : 'File not copied; original inventory reference only') : (row.datasheet ? 'External datasheet link' : 'Not provided'),
      mix: '' });
  }
  function client(request) {
    request = request || fetch;
    async function json(url) {
      var response = await request(url, { method: 'GET', cache: 'no-store', credentials: 'omit', referrerPolicy: 'no-referrer', signal: AbortSignal.timeout(25000) });
      if (!response.ok) throw new Error('Inventory read failed (' + response.status + '). Refresh or load an inventory JSON export.');
      return response.json();
    }
    async function file(f) {
      if (!f) throw new Error('This datasheet file is missing from inventory.');
      if (!f.truncated && typeof f.content === 'string') return JSON.parse(f.content);
      return json(rawUrl(f.raw_url));
    }
    async function load() {
      var gist = await json(API), f = (gist.files || {})['adhesives_data.json'];
      var payload = await file(f);
      return { rows: rows(payload), files: gist.files || {}, mode: 'Live inventory', updatedAt: gist.updated_at || '', loadedAt: new Date().toISOString() };
    }
    async function attachment(row, catalog) {
      if (row.dsFileData) return row.dsFileData;
      if (row.dsType !== 'file') return '';
      if (!catalog.files) throw new Error('The JSON export contains a datasheet reference but no file content.');
      var payload = await file(catalog.files['ds_' + row.id + '.json']);
      var value = safeData(payload.data);
      if (!value) throw new Error('Datasheet is unsupported, invalid, or exceeds the 6 MB encoded-file limit.');
      return value;
    }
    return { load: load, attachment: attachment };
  }
  return { client: client, rows: rows, material: material, safeUrl: safeUrl, safeData: safeData, platform: PLATFORM, api: API };
});
