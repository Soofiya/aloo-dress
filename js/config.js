/* ==========================================================================
   config.js  —  THE ONLY FILE YOU EVER NEED TO EDIT
   --------------------------------------------------------------------------
   TO ADD NEW CLOTHES (the easy way):
     1. Save the PNG (same size as aloo.png, transparent) into the right folder:
          assets/layers/hats/        hats and head items
          assets/layers/tops/        tops, coats, dresses
          assets/layers/bottoms/     shorts, skirts, trousers
          assets/layers/overalls/    dungarees, jumpsuits (they remove bottoms)
          assets/layers/shoes/       boots, slippers
          assets/layers/neck/        scarves, collars
          assets/layers/face/        glasses, masks
          assets/layers/tail/        tail and back accessories
          assets/layers/props/       held items
          assets/layers/background/  backgrounds
     2. In Terminal, in this folder, run:   python3 tools/build_assets.py
        It makes the thumbnail AND adds the new item to the list below for you.
     3. (Optional) Open this file and tidy the item's display name.
   Done. Upload to GitHub and it's live.

   You can also add a line by hand — see the ITEMS list at the bottom.
   ========================================================================== */

const GAME = {
  title: 'Aloo All Day',

  // 'png' now. After running  python3 tools/build_assets.py --webp  you can
  // change this to 'webp' for much smaller files.
  imageFormat: 'png',

  // Items already worn when the game starts (use item ids). Empty = bare Aloo.
  startWearing: [],
};

/* --------------------------------------------------------------------------
   LAYER ORDER  (back to front)
   Reorder this list to change what sits on top of what.
   'aloo' is the base body image (assets/aloo.png). Keep it in the list.
   -------------------------------------------------------------------------- */
const LAYER_ORDER = [
  'background',
  'aloo',
  'tail',      // tail and back accessories
  'bottoms',
  'tops',      // tops, coats and dresses
  'overalls',  // dungarees and jumpsuits: sit over tops and bottoms
  'shoes',     // boots and slippers
  'neck',
  'face',
  'hats',
  'props',     // held items and foreground props
];

/* --------------------------------------------------------------------------
   CATEGORIES
     label  - the category's name (used for tidiness; there are no tabs any more)
     rule   - 'replace' = one item at a time, 'stack' = several at once
     clears - (optional) wearing something here removes everything in these
              other categories. Example: dungarees remove any shorts.
   Categories only decide the layer order and the replace/stack rules.
   -------------------------------------------------------------------------- */
const CATEGORIES = {
  background: { label: 'Backgrounds', rule: 'replace' },
  tail:       { label: 'Tail',        rule: 'stack'   },
  bottoms:    { label: 'Bottoms',     rule: 'replace' },
  tops:       { label: 'Tops',        rule: 'replace' },
  overalls:   { label: 'Dungarees',   rule: 'replace', clears: ['bottoms'] },
  shoes:      { label: 'Shoes',       rule: 'replace' },
  neck:       { label: 'Neck',        rule: 'replace' },
  face:       { label: 'Face',        rule: 'replace' },
  hats:       { label: 'Hats',        rule: 'replace' },
  props:      { label: 'Props',       rule: 'stack'   },
};

/* --------------------------------------------------------------------------
   ITEMS  —  one line per item.  THE ORDER HERE IS THE ORDER IN THE CAROUSEL.
   Drag lines up or down to rearrange the carousel.
     id       - the PNG file name without .png (no spaces)
     category - the folder it lives in (a key from CATEGORIES above)
     name     - shown under the thumbnail and read out by screen readers
   Files are found automatically:
     assets/layers/<category>/<id>.png    full-size layer
     assets/thumbs/<category>/<id>.png    thumbnail (made by tools/build_assets.py)
   To remove an item: delete its line (and, if you like, its PNG).
   -------------------------------------------------------------------------- */
const ITEMS = [
  { id: 'santahat', category: 'hats', name: 'Santa hat' },
  { id: 'scarf', category: 'neck', name: 'Scarf' },
  { id: 'yellowshirt', category: 'tops', name: 'Yellow t-shirt' },
  { id: 'pinkshirt', category: 'tops', name: 'Pink t-shirt' },
  { id: 'whiteshirt', category: 'tops', name: 'White shirt' },
  { id: 'orangetop', category: 'tops', name: 'Orange top' },
  { id: 'jumper', category: 'tops', name: 'Leopard jumper' },
  { id: 'blackjumper', category: 'tops', name: 'Black jumper' },
  { id: 'checkjacket', category: 'tops', name: 'Check jacket' },
  { id: 'santajacket', category: 'tops', name: 'Santa jacket' },
  { id: 'pjtop', category: 'tops', name: 'Pyjama top' },
  { id: 'blackshorts', category: 'bottoms', name: 'Black shorts' },
  { id: 'blueshort', category: 'bottoms', name: 'Blue shorts' },
  { id: 'browntrousers', category: 'bottoms', name: 'Brown trousers' },
  { id: 'blackflares', category: 'bottoms', name: 'Black flares' },
  { id: 'santatrousers', category: 'bottoms', name: 'Santa trousers' },
  { id: 'pjbottom', category: 'bottoms', name: 'Pyjama bottoms' },
  { id: 'bluedungarees', category: 'overalls', name: 'Blue dungarees' },
  { id: 'purpledungarees', category: 'overalls', name: 'Purple dungarees' },
  { id: 'yellowdungarees', category: 'overalls', name: 'Yellow dungarees' },
  { id: 'rainbowdungarees', category: 'overalls', name: 'Rainbow dungarees' },
  { id: 'greenjumpsuit', category: 'overalls', name: 'Green jumpsuit' },
  { id: 'redboots', category: 'shoes', name: 'Red boots' },
  { id: 'yellowboots', category: 'shoes', name: 'Yellow boots' },
  { id: 'pinkslippers', category: 'shoes', name: 'Pink slippers' },

  // ▲▲ NEW ITEMS ARE ADDED ABOVE THIS LINE BY tools/build_assets.py — keep this comment ▲▲
];
