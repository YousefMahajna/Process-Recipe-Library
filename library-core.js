/* Shared data logic. No UI, credentials or application code is stored in the database. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.RecipeLibrary = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  function copy(v) { return JSON.parse(JSON.stringify(v)); }
  function canonical(v) {
    if (v === null || typeof v !== 'object') return JSON.stringify(v);
    if (Array.isArray(v)) return '[' + v.map(canonical).join(',') + ']';
    return '{' + Object.keys(v).sort().map(function (k) { return JSON.stringify(k) + ':' + canonical(v[k]); }).join(',') + '}';
  }
  // Firebase removes null/empty nodes and can return numeric-key maps as arrays.
  // Compare the stored meaning, independent of those transport representations.
  function stored(v) {
    if (v == null) return null;
    if (typeof v !== 'object') return v;
    var out = {};
    Object.keys(v).forEach(function (k) { var x = stored(v[k]); if (x !== null) Object.defineProperty(out, k, { value: x, enumerable: true }); });
    return Object.keys(out).length ? out : null;
  }
  function token(v) { return canonical(stored(v)); }
  function uid() { return 'r-' + crypto.randomUUID(); }
  function key(k) { return typeof k === 'string' && k.length > 0 && k.length <= 250 && !/[.#$\[\]\/\u0000-\u001f\u007f]/.test(k) && !['__proto__', 'constructor', 'prototype'].includes(k); }
  function flavors(r) {
    var values = Array.isArray(r.flavors) ? r.flavors : String(r.flavor || '').split(/[,;\n]/);
    return Array.from(new Set(values.map(function (v) { return String(v).trim(); }).filter(Boolean)));
  }
  function applies(r, flavor) { return r.allFlavors === true || flavors(r).includes(flavor); }
  function flavorLabel(r) { return r.allFlavors ? 'All flavors' : flavors(r).join(', '); }
  function validate(r) {
    ['product', 'stage', 'name'].forEach(function (k) { if (typeof r[k] !== 'string' || !r[k].trim()) throw new Error(k + ' is required.'); });
    if (!r.allFlavors && !flavors(r).length) throw new Error('Type at least one flavor or select All flavors.');
    if (!Number.isInteger(Number(r.stageOrder)) || Number(r.stageOrder) < 1) throw new Error('Stage order must be a positive whole number.');
    if (!['Draft', 'Released', 'Obsolete'].includes(r.status)) throw new Error('Invalid recipe status.');
    ['tools', 'epoxies', 'jigs', 'steps', 'images'].forEach(function (k) {
      if (r[k] !== undefined && !Array.isArray(r[k])) throw new Error(k + ' must be an array.');
    });
    ['tools', 'epoxies', 'jigs'].forEach(function (k) {
      (r[k] || []).forEach(function (v) { if (!v || typeof v !== 'object' || Array.isArray(v)) throw new Error('Invalid ' + k + ' row.'); });
    });
    ['tools', 'jigs'].forEach(function (k) {
      (r[k] || []).forEach(function (item) {
        if (item.images !== undefined && !Array.isArray(item.images)) throw new Error(k + ' pictures must be an array.');
        if ((item.images || []).length > 3) throw new Error('Up to 3 pictures per individual tool or jig.');
        (item.images || []).forEach(function (im) { if (!im || !key(im.id)) throw new Error('Invalid tool or jig picture reference.'); });
      });
    });
    (r.steps || []).forEach(function (s) { if (typeof s !== 'string') throw new Error('Procedure steps must be text.'); });
    if ((r.images || []).length > 12) throw new Error('Up to 12 photos per recipe.');
    (r.images || []).forEach(function (im) { if (!im || !key(im.id)) throw new Error('Invalid photo reference.'); });
    if (r.cure && (!Array.isArray(r.cure.segments))) throw new Error('Curing segments must be an array.');
    ((r.cure && r.cure.segments) || []).forEach(function (s, i) {
      if (!s || s.temp === '' || s.temp == null || !Number.isFinite(Number(s.temp)) || Number(s.temp) < -273.15 || Number(s.temp) > 3000 || s.min === '' || s.min == null || !Number.isFinite(Number(s.min)) || Number(s.min) <= 0) {
        throw new Error('Curing segment ' + (i + 1) + ': enter a temperature between -273.15 and 3000 °C and a time greater than zero.');
      }
    });
    if (r.cure && r.cure.points !== undefined) {
      var pts = r.cure.points;
      if (!Array.isArray(pts) || pts.length === 1) throw new Error('A curing profile needs a start and end point, or no points.');
      pts.forEach(function(p,i) {
        if (!p || p.time === '' || p.time == null || !Number.isFinite(Number(p.time)) || Number(p.time)<0 || p.temp === '' || p.temp == null || !Number.isFinite(Number(p.temp)) || Number(p.temp)<-273.15 || Number(p.temp)>3000 || (i && Number(p.time)<=Number(pts[i-1].time))) throw new Error('Curing points require increasing non-negative times and valid temperatures.');
      });
      var segments = r.cure.segments || [];
      if (segments.length !== Math.max(0,pts.length-1)) throw new Error('Curing points and segments disagree. Reopen the profile editor.');
      segments.forEach(function(seg,i) { if(Math.abs(Number(seg.temp)-Number(pts[i+1].temp))>0.000001 || Math.abs(Number(seg.min)-(Number(pts[i+1].time)-Number(pts[i].time)))>0.000001) throw new Error('Curing points and segment values disagree.'); });
    }
    if (r.cure && r.cure.chart) {
      var chart = r.cure.chart;
      ['timeMax','timeStep','timeSnap','tempSnap'].forEach(function(k){if(chart[k]!==undefined && chart[k]!=='' && (!Number.isFinite(Number(chart[k])) || Number(chart[k])<=0))throw new Error('Curing chart '+k+' must be positive or Auto.');});
      ['tempMin','tempMax'].forEach(function(k){if(chart[k]!==undefined && chart[k]!=='' && (!Number.isFinite(Number(chart[k])) || Number(chart[k])<-273.15 || Number(chart[k])>3000))throw new Error('Curing chart temperature limits must be between -273.15 and 3000 °C.');});
      if(chart.tempMin!==undefined&&chart.tempMin!==''&&chart.tempMax!==undefined&&chart.tempMax!==''&&Number(chart.tempMin)>=Number(chart.tempMax))throw new Error('Temperature axis maximum must be above minimum.');
      var last=(r.cure.points||[]).slice(-1)[0],extent=Math.max(last?0.001:10,Number(chart.timeMax)||0,last?Number(last.time):0);
      if(Number(chart.timeStep)>0 && extent/Number(chart.timeStep)>200)throw new Error('Choose a larger time tick interval (maximum 200 divisions).');
    }
    return r;
  }
  function clean(r) {
    var out = copy(r);
    delete out._id; delete out._base;
    out.flavors = flavors(out); out.flavor = flavorLabel(out); out.allFlavors = out.allFlavors === true;
    return out;
  }
  function validateProduct(p) {
    if (!p || !key(p.id) || typeof p.product !== 'string' || !p.product.trim()) throw new Error('Product name and valid ID are required.');
    ['sfg', 'sa'].forEach(function (group) {
      if (!Array.isArray(p[group])) throw new Error(group.toUpperCase() + ' flow must be a list.');
      p[group].forEach(function (row, i) {
        if (!row || typeof row.step !== 'string' || !row.step.trim()) throw new Error(group.toUpperCase() + ' row ' + (i + 1) + ': Step is required.');
        ['machine', 'adhesive', 'curing', 'comment'].forEach(function (k) { if (typeof row[k] !== 'string') throw new Error('Invalid ' + k + ' in flow row.'); });
      });
    });
    return p;
  }
  function validateFlow(f) {
    if(!f || !key(f.id) || typeof f.product!=='string' || !f.product.trim() || !Array.isArray(f.steps))throw new Error('A product name and an ordered flow are required.');
    var ids=new Set();f.steps.forEach(function(s,i){if(!s || !key(s.id) || ids.has(s.id) || typeof s.name!=='string' || !s.name.trim() || !['process','testing'].includes(s.type))throw new Error('Step '+(i+1)+': enter a unique ID, name, and Process or Testing type.');ids.add(s.id);if(s.recipeId && !key(s.recipeId))throw new Error('Invalid linked recipe.');if(s.comment!==undefined&&typeof s.comment!=='string')throw new Error('Step comments must be text.');});return f;
  }
  function validateBom(b) {
    if(!b || !key(b.id) || typeof b.product!=='string' || !b.product.trim() || !Array.isArray(b.items) || !Array.isArray(b.flavors))throw new Error('BOM requires a product, flavor list, and item list.');
    var ids=new Set();b.flavors.forEach(function(f){if(typeof f!=='string'||!f.trim())throw new Error('BOM flavors must be text.');});
    if(b.excludedFlavors!==undefined&&(!Array.isArray(b.excludedFlavors)||b.excludedFlavors.some(function(f){return typeof f!=='string'||!f.trim();})))throw new Error('Unavailable flavors must be a list of names.');
    b.items.forEach(function(item,i){if(!item || !key(item.id)||ids.has(item.id)||typeof item.name!=='string'||!item.name.trim()||!['Mechanical','Optical','TOSA','ROSA'].includes(item.category)||!Array.isArray(item.options))throw new Error('BOM item '+(i+1)+': enter a name, category, unique ID, and PN options.');ids.add(item.id);
      item.options.forEach(function(o,j){if(!o||!key(o.id)||ids.has(o.id)||(!String(o.nvpn||'').trim()&&!String(o.tfcPn||'').trim())||!['all','specific','unassigned'].includes(o.scope)||!Array.isArray(o.flavors))throw new Error('BOM option '+(j+1)+' in '+item.name+': PN, unique ID, and applicability are required.');ids.add(o.id);if(o.scope==='specific'&&!o.flavors.length)throw new Error('Specific-flavor PN options need at least one flavor.');o.flavors.forEach(function(f){if(typeof f!=='string'||!f.trim())throw new Error('Invalid BOM option flavor.');});if(typeof o.reviewRequired!=='boolean')throw new Error('BOM option review flag is required.');
        ['nvpn','tfcPn','description','chip','coc','substrate','pSide','pd','tia','stockNote','note','source'].forEach(function(k){if(o[k]!==undefined&&typeof o[k]!=='string')throw new Error('BOM '+k+' must be text.');});
      });
    });
    var tosaIds=new Set(b.items.filter(function(i){return i.category==='TOSA';}).flatMap(function(i){return i.options.map(function(o){return o.id;});}));
    b.items.forEach(function(i){i.options.forEach(function(o){if(o.tosaRestriction!==undefined&&typeof o.tosaRestriction!=='boolean')throw new Error('TOSA restriction must be true or false.');if(o.compatibleTosa!==undefined&&(!Array.isArray(o.compatibleTosa)||o.compatibleTosa.some(function(id){return !tosaIds.has(id);})))throw new Error('BOM compatibility links must reference existing TOSA options.');});});
    if(b.lensReference!==undefined&&(!Array.isArray(b.lensReference)||b.lensReference.some(function(r){return !r||typeof r.eml!=='string'||typeof r.pSide!=='string'||!Array.isArray(r.tosaOptions)||!Array.isArray(r.lensOptions)||typeof r.coupled!=='string'||typeof r.required!=='string';})))throw new Error('Invalid lens reference table.');
    return b;
  }
  function conflict() { var e = new Error('This recipe changed or was deleted after you opened it. Your edits are retained. Download your draft, then cancel and reopen the latest recipe to merge your changes.'); e.conflict = true; return e; }
  function createStore(base, request) {
    var url = base.replace(/\/+$/, '') + '.json';
    request = request || fetch;
    async function read(etag) {
      var res = await request(url, { cache: 'no-store', headers: etag ? { 'X-Firebase-ETag': 'true' } : {} });
      if (!res.ok) { var e = new Error('Database read failed (' + res.status + ').'); e.status = res.status; throw e; }
      var data = await res.json();
      if (data !== null && (typeof data !== 'object' || Array.isArray(data))) throw new Error('Invalid database root. No data was changed.');
      return { data: data || {}, etag: res.headers.get('ETag') };
    }
    async function transact(change) {
      var operation = uid();
      for (var attempt = 0; attempt < 6; attempt++) {
        var snap = await read(true);
        if (!snap.etag) throw new Error('Database did not return an ETag. Saving is blocked to prevent overwriting another user.');
        var data = copy(snap.data);
        change(data, operation);
        data.meta = Object.assign({}, data.meta, { updatedAt: new Date().toISOString(), schemaVersion: 3 });
        var res;
        try {
          res = await request(url, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'if-match': snap.etag }, body: JSON.stringify(data) });
        } catch (e) {
          throw new Error('Connection interrupted. The save outcome is uncertain. Keep or download your draft and Refresh before retrying.');
        }
        if (res.status === 412) continue;
        if (!res.ok) { var err = new Error('Database save failed (' + res.status + '). No partial update was sent.'); err.status = res.status; throw err; }
        return data;
      }
      throw new Error('The library is busy with other saves. Your draft is retained; please try Save again.');
    }
    function history(data, id, previous, op) {
      if (!previous) return;
      data.history = data.history || {};
      data.history[id] = data.history[id] || {};
      data.history[id][Date.now() + '-' + op] = copy(previous);
    }
    function images(data, photos) {
      data.images = data.images || {};
      Object.keys(photos || {}).forEach(function (id) {
        if (!key(id) || !photos[id] || typeof photos[id].data !== 'string' || !/^data:image\/(jpeg|png|webp);base64,/.test(photos[id].data)) throw new Error('Invalid image in backup.');
        if (data.images[id] && token(data.images[id]) !== token(photos[id])) throw new Error('A photo ID conflicts with existing data. Nothing was imported.');
        data.images[id] = copy(photos[id]);
      });
    }
    function references(data, r) {
      var all = (r.images || []).slice();
      ['tools','jigs'].forEach(function(k){(r[k]||[]).forEach(function(item){all=all.concat(item.images||[]);});});
      all.forEach(function (im) { if (!data.images || !data.images[im.id]) throw new Error('Photo ' + im.id + ' is missing. Nothing was saved.'); });
    }
    async function save(recipe, expected, photos) {
      var r = clean(recipe); if (!key(r.id)) throw new Error('Invalid recipe ID.'); validate(r);
      return transact(function (data, op) {
        data.recipes = data.recipes || {};
        if (token(data.recipes[r.id]) !== expected) throw conflict();
        history(data, r.id, data.recipes[r.id], op);
        images(data, photos); references(data, r);
        data.recipes[r.id] = copy(r);
      });
    }
    async function remove(id, expected) {
      if (!key(id)) throw new Error('Invalid recipe ID.');
      return transact(function (data, op) {
        data.recipes = data.recipes || {};
        if (!data.recipes[id] || token(data.recipes[id]) !== expected) throw conflict();
        history(data, id, data.recipes[id], op);
        data.deleted = data.deleted || {};
        data.deleted[id] = { recipe: data.recipes[id], deletedAt: new Date().toISOString() };
        delete data.recipes[id];
      });
    }
    async function merge(list, photos, expected, oldHistory, archived, products, expectedProducts, productHistory, flowBundle, bomBundle) {
      var seen = new Set();
      list = list.map(function (r) {
        var out = clean(r); validate(out);
        if (!key(out.id) || seen.has(out.id)) throw new Error('Duplicate or invalid recipe ID in import.');
        seen.add(out.id); return out;
      });
      return transact(function (data, op) {
        data.recipes = data.recipes || {};
        list.forEach(function (r) { if (token(data.recipes[r.id]) !== expected[r.id]) throw conflict(); });
        images(data, photos);
        list.forEach(function (r) {
          references(data, r); history(data, r.id, data.recipes[r.id], op);
          data.recipes[r.id] = copy(r);
        });
        data.history = data.history || {};
        Object.keys(oldHistory || {}).forEach(function (id) {
          if (!key(id) || !oldHistory[id] || typeof oldHistory[id] !== 'object') throw new Error('Invalid history in backup.');
          data.history[id] = data.history[id] || {};
          Object.keys(oldHistory[id]).forEach(function (k) {
            if (!key(k)) throw new Error('Invalid history key.');
            if (data.history[id][k] && token(data.history[id][k]) !== token(oldHistory[id][k])) throw new Error('Conflicting history entry. Nothing was imported.');
            data.history[id][k] = copy(oldHistory[id][k]);
          });
        });
        data.deleted = data.deleted || {};
        Object.keys(archived || {}).forEach(function (id) { if (!key(id)) throw new Error('Invalid archive ID.'); if (!data.deleted[id]) data.deleted[id] = copy(archived[id]); });
        data.adhesiveProducts = data.adhesiveProducts || {};
        data.adhesiveHistory = data.adhesiveHistory || {};
        Object.keys(products || {}).forEach(function (id) {
          var p = copy(products[id]); p.id = id; validateProduct(p);
          if (token(data.adhesiveProducts[id]) !== (expectedProducts || {})[id]) throw new Error('Adhesive flow changed since import preview. Import stopped; reload and try again.');
          if (data.adhesiveProducts[id]) {
            data.adhesiveHistory[id] = data.adhesiveHistory[id] || {};
            data.adhesiveHistory[id][Date.now() + '-' + op] = copy(data.adhesiveProducts[id]);
          }
          data.adhesiveProducts[id] = p;
        });
        Object.keys(productHistory || {}).forEach(function (id) {
          if (!key(id)) throw new Error('Invalid adhesive history ID.');
          data.adhesiveHistory[id] = data.adhesiveHistory[id] || {};
          Object.keys(productHistory[id]).forEach(function (k) {
            if (!key(k) || (data.adhesiveHistory[id][k] && token(data.adhesiveHistory[id][k]) !== token(productHistory[id][k]))) throw new Error('Conflicting adhesive history. Import stopped.');
            data.adhesiveHistory[id][k] = copy(productHistory[id][k]);
          });
        });
        if(flowBundle){
          data.processFlows=data.processFlows||{};data.processFlowHistory=data.processFlowHistory||{};
          Object.keys(flowBundle.flows||{}).forEach(function(id){var f=copy(flowBundle.flows[id]);f.id=id;validateFlow(f);if(token(data.processFlows[id])!==(flowBundle.expected||{})[id])throw new Error('Product process flow changed after import preview. Import stopped.');
            if(data.processFlows[id]){data.processFlowHistory[id]=data.processFlowHistory[id]||{};data.processFlowHistory[id][Date.now()+'-'+op]=copy(data.processFlows[id]);}data.processFlows[id]=f;});
          Object.keys(flowBundle.history||{}).forEach(function(id){if(!key(id))throw new Error('Invalid process flow history ID.');data.processFlowHistory[id]=data.processFlowHistory[id]||{};Object.keys(flowBundle.history[id]).forEach(function(k){if(!key(k)||(data.processFlowHistory[id][k]&&token(data.processFlowHistory[id][k])!==token(flowBundle.history[id][k])))throw new Error('Conflicting process flow history. Import stopped.');data.processFlowHistory[id][k]=copy(flowBundle.history[id][k]);});});
        }
        if(bomBundle){data.partsBoms=data.partsBoms||{};data.partsBomHistory=data.partsBomHistory||{};
          Object.keys(bomBundle.boms||{}).forEach(function(id){var b=copy(bomBundle.boms[id]);b.id=id;validateBom(b);if(token(data.partsBoms[id])!==(bomBundle.expected||{})[id])throw new Error('Optical/mechanical BOM changed after import preview. Import stopped.');if(data.partsBoms[id]){data.partsBomHistory[id]=data.partsBomHistory[id]||{};data.partsBomHistory[id][Date.now()+'-'+op]=copy(data.partsBoms[id]);}data.partsBoms[id]=b;});
          Object.keys(bomBundle.history||{}).forEach(function(id){if(!key(id))throw new Error('Invalid BOM history ID.');data.partsBomHistory[id]=data.partsBomHistory[id]||{};Object.keys(bomBundle.history[id]).forEach(function(k){if(!key(k)||(data.partsBomHistory[id][k]&&token(data.partsBomHistory[id][k])!==token(bomBundle.history[id][k])))throw new Error('Conflicting BOM history. Import stopped.');data.partsBomHistory[id][k]=copy(bomBundle.history[id][k]);});});
        }
      });
    }
    async function restore(id, expectedArchive) {
      if (!key(id)) throw new Error('Invalid recipe ID.');
      return transact(function (data) {
        data.recipes = data.recipes || {};
        if (data.recipes[id] || !data.deleted || token(data.deleted[id]) !== expectedArchive) throw conflict();
        var r = copy(data.deleted[id].recipe); validate(r); references(data, r);
        r.updatedAt = new Date().toISOString();
        data.recipes[id] = r;
        delete data.deleted[id];
      });
    }
    async function saveProduct(product, expected) {
      var p = copy(product); delete p._base; validateProduct(p);
      return transact(function (data, op) {
        data.adhesiveProducts = data.adhesiveProducts || {};
        if (token(data.adhesiveProducts[p.id]) !== expected) throw new Error('This product’s adhesive flow changed after you opened it. Your draft is retained. Download it, then reopen the latest flow and merge your changes.');
        if (data.adhesiveProducts[p.id]) {
          data.adhesiveHistory = data.adhesiveHistory || {};
          data.adhesiveHistory[p.id] = data.adhesiveHistory[p.id] || {};
          data.adhesiveHistory[p.id][Date.now() + '-' + op] = copy(data.adhesiveProducts[p.id]);
        }
        data.adhesiveProducts[p.id] = p;
      });
    }
    async function saveFlow(flow,expected) {
      var f=copy(flow);validateFlow(f);
      return transact(function(data,op){data.processFlows=data.processFlows||{};if(token(data.processFlows[f.id])!==expected)throw new Error('This product process flow changed after you opened it. Your draft is retained. Download it, then reopen the latest flow to merge your edits.');
        Object.keys(data.processFlows).forEach(function(id){if(id!==f.id&&data.processFlows[id].product.trim().toLowerCase()===f.product.trim().toLowerCase())throw new Error('A process flow already exists for this product. Edit that flow instead.');});
        if(data.processFlows[f.id]){data.processFlowHistory=data.processFlowHistory||{};data.processFlowHistory[f.id]=data.processFlowHistory[f.id]||{};data.processFlowHistory[f.id][Date.now()+'-'+op]=copy(data.processFlows[f.id]);}data.processFlows[f.id]=f;});
    }
    async function saveBom(bom,expected){var b=copy(bom);validateBom(b);return transact(function(data,op){data.partsBoms=data.partsBoms||{};if(token(data.partsBoms[b.id])!==expected)throw new Error('This optical/mechanical BOM changed after you opened it. Your draft is retained. Download it, then reopen the latest BOM to merge your edits.');Object.keys(data.partsBoms).forEach(function(id){if(id!==b.id&&data.partsBoms[id].product.trim().toLowerCase()===b.product.trim().toLowerCase())throw new Error('A BOM already exists for this product.');});if(data.partsBoms[b.id]){data.partsBomHistory=data.partsBomHistory||{};data.partsBomHistory[b.id]=data.partsBomHistory[b.id]||{};data.partsBomHistory[b.id][Date.now()+'-'+op]=copy(data.partsBoms[b.id]);}data.partsBoms[b.id]=b;});}
    return { read: read, save: save, remove: remove, merge: merge, restore: restore, saveProduct: saveProduct, saveFlow:saveFlow,saveBom:saveBom };
  }
  return { token: token, uid: uid, key: key, flavors: flavors, applies: applies, flavorLabel: flavorLabel, validate: validate, clean: clean, validateProduct: validateProduct, validateFlow:validateFlow,validateBom:validateBom, createStore: createStore };
});

