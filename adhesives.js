/* Transcribed from the supplied Splinter Bring-Up / MTL Process Lab reference, slide 9/9. */
(function () {
  'use strict';
  function row(step, machine, adhesive, curing, comment, withdrawn) {
    return { step: step, machine: machine, adhesive: adhesive, curing: curing, comment: comment || '', withdrawn: !!withdrawn };
  }
  var seed = {
    id: 'splinter', product: 'Splinter', source: 'Splinter Bring-Up | MTL Process Lab — Adhesives & Curing Conditions, slide 9/9 (user-provided image).',
    sfg: [
      row('CDR LID', 'Amicra', 'Loctite Ablestik CE3940-08 174B 1', '160°C / 1 hr', 'Vendor summary calls CE3940-08 “LDS”; Henkel.'),
      row('TIA / CAPs', 'Datacon', 'Loctite Ablestik 84-1LMISR4', '170°C / 1 hr', 'Henkel.'),
      row('TIA WB', 'K&S', '1 mil wire', '', 'Wire bonding; listed as material in source.'),
      row('TOSA', 'TOSA Jig', 'Loctite Ablestik 2035SC / 2030SC', '150°C / 5 min', 'Henkel.'),
      row('TOSA WB', 'K&S', '1 mil wire', '', 'Wire bonding; listed as material in source.'),
      row('TOSA TEC WB', 'K&S', '1 mil wire', '', 'Wire bonding; listed as material in source.'),
      row('TX FB P&P', 'Datacon', 'Optocast 3410-XTP', '120°C / 30 min', 'EMI UV. Vendor summary leaves curing blank; process table specifies this condition.'),
      row('RX FB P&P', 'ADST', 'Optocast 3410-XTP', '120°C / 30 min', 'EMI UV. Vendor summary leaves curing blank; process table specifies this condition.'),
      row('LD2 P&P', 'ADST / Ficontec', 'Optocast 3410', '150°C / 1 hr', 'EMI UV. Vendor summary leaves curing blank; process table specifies this condition.'),
      row('TOSA Cover P&P', 'TOSA Lid Jig', 'Loctite Ablestik 2030SC', '150°C / 5 min', 'Henkel. Vendor summary leaves curing blank; process table specifies this condition.'),
      row('RX Cover P&P', 'Manual', 'Loctite Ablestik 2035SC', '150°C / 5 min', 'Adhesive is crossed out in source; no replacement is specified. Verify before use.', true),
      row('TEC WB Cover', 'Manual', 'Loctite Ablestik 2030SC', '150°C / 5 min', 'Henkel. Vendor summary leaves curing blank; process table specifies this condition.')
    ],
    sa: [
      row('PCB → BKSHL', '', 'TLF 10000', '', 'Henkel. Machine and curing not specified in source.'),
      row('DSP LID → BKSHL', '', 'TLF 20000CGEL', '85°C / 1 hr', 'Henkel. NEW. Machine not specified in source.'),
      row('TOSA LID → BKSHL', '', 'TLF 10000', '', 'Henkel. Machine and curing not specified in source.'),
      row('Comp → DSP LID', '', 'TLF 10000', '', 'Henkel. Machine and curing not specified in source.'),
      row('Viking', '', 'TGR5000SF', '', 'Henkel. NEW. Source lists Viking without an assembly joint or machine; curing not specified.')
    ]
  };
  function normalize(p, id, array) {
    var out = JSON.parse(JSON.stringify(p)); out.id = id;
    ['sfg', 'sa'].forEach(function (k) { out[k] = array(out[k]).map(function (r) { return Object.assign(row('', '', '', '', ''), r); }); });
    return out;
  }
  window.AdhesivesPage = { seed: seed, normalize: normalize };
})();
