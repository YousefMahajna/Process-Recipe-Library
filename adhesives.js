/* Starting reference tables transcribed from the user-supplied Splinter and Stryfe images. */
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
  var stryfe = {
    id: 'stryfe', product: 'Stryfe', source: 'User-supplied Stryfe references: Process – materials table (SFG) and TIM2 status (SA).',
    sfgNote: 'Reference material options. Electrical termination lists alternative connector/wire-bond routes; lid assembly lists Triple Lid and Lid/chip methods. Machine and curing temperature/time are not provided.',
    saLayout: 'tim2', saNote: 'TIM2 candidate materials, not sequential steps or a declaration of Stryfe approval. k and minimum BLT values are transcribed as shown; complete units are not specified. Status text refers to Wolverine where stated. Machine and curing conditions are not supplied.',
    sfg: [
      row('EOA attach · EOA to PCB', '', 'HENKEL ABLESTIK-ABP-2035SCR OR HENKEL LOCTITE ECCOBOND EN 3838T', '', 'Technology: Structural adhesive. Source confidence note: 2035SC (Wolverine TOSA attach) redesign due to REACH regulation; HENKEL LOCTITE ECCOBOND EN 3838T is chosen following wire bonding issue.'),
      row('EOA attach · Electrical termination · BtB connector', '', 'NA', '', 'Electrical termination alternative 1. Technology: BtB connector; source bonding material: NA.'),
      row('EOA attach · Electrical termination · Wire bonding', '', '1MIL gold wire', '', 'Electrical termination alternative 2. Technology: Wire bonding.'),
      row('FAU AA', '', 'Optocast 3410-XTP', '', 'Technology: UV/Thermal. Source confidence/status: approved. No curing temperature/time is provided.'),
      row('Lid assembly · Sagitta Lid to Sagitta', '', 'DOW - ME1506 TIM1 Gel', '', 'Method: Triple Lid. Technology: Curable TIM1 gel. Source confidence note: reported by Dow as 10 years industry standard based on feedback from other customers.'),
      row('Lid assembly · Sagitta lid to Board', '', 'DOW ME 1439', '', 'Method: Triple Lid. Technology: Lid adhesive. Source confidence note: improvement of SE4450 (10 years industry standard), better thermal tacking.'),
      row('Lid assembly · Arcus lid to Arcus', '', 'DOW - ME1506 TIM1 Gel', '', 'Method: Triple Lid. Technology: Curable TIM1 gel. Source confidence note: reported by Dow as 10 years industry standard based on feedback from other customers.'),
      row('Lid assembly · Arcus lid to Sagitta lid', '', 'Henkel TIM1007', '', 'Method: Triple Lid. Technology: Low Modulus TC adhesive. Source confidence/status: Running RT in Cyclops.'),
      row('Lid assembly · Lid To chip', '', 'Henkel TIM1007', '', 'Method: Lid/chip (alternative method). Technology: High TC adhesive. Source confidence/status: In progress – DSP lid in Wolverine, Sagitta lid in Cyclops. TIM1007 is under improvement with 25 µm fillers for stress control, plus checking with vendor on better thermal tacking.'),
      row('Mech assembly · EOA to back shell', '', 'See TIM2 status', '', 'Technology: TIM2. Refer to the SA/TIM2 candidate table; no individual material is assigned in the SFG source.'),
      row('Mech assembly · Arcus/Sagitta lid to BS', '', 'See TIM2 status', '', 'Technology: TIM2. Refer to the SA/TIM2 candidate table; no individual material is assigned in the SFG source.')
    ],
    sa: [
      Object.assign(row('TIM2 candidate 1', '', 'HENKEL TLF10000', '', ''), { k: '10W', technology: '1K', diamondContent: 'No Diamond', minBlt: '200', status: 'Wolverine TIM2' }),
      Object.assign(row('TIM2 candidate 2', '', 'HENKEL TLF12000', '', ''), { k: '12W', technology: '1K, curable', diamondContent: 'No Diamond', minBlt: '200', status: 'Tested on Wolverine - in RT' }),
      Object.assign(row('TIM2 candidate 3', '', 'DOW TC-7120', '', ''), { k: '13.8W', technology: '1K', diamondContent: 'No Diamond', minBlt: '180', status: 'Tested on Wolverine - in RT' }),
      Object.assign(row('TIM2 candidate 4', '', 'DOW TC-3120', '', ''), { k: '12W', technology: '1K, curable', diamondContent: 'No Diamond', minBlt: '200', status: 'Tested on Wolverine - in RT' }),
      Object.assign(row('TIM2 candidate 5', '', 'HENKEL TLF20000', '', ''), { k: '20W', technology: '1K, curable', diamondContent: 'Diamond', minBlt: '250', status: '' }),
      Object.assign(row('TIM2 candidate 6', '', 'DOW TC-3205', '', ''), { k: '20W', technology: '1K, curable', diamondContent: 'Diamond', minBlt: '200', status: '' })
    ]
  };
  function normalize(p, id, array) {
    var out = JSON.parse(JSON.stringify(p)); out.id = id;
    ['sfg', 'sa'].forEach(function (k) { out[k] = array(out[k]).map(function (r) { return Object.assign(row('', '', '', '', ''), r); }); });
    return out;
  }
  window.AdhesivesPage = { seed: seed, seeds: { splinter: seed, stryfe: stryfe }, normalize: normalize };
})();
