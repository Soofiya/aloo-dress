/* ==========================================================================
   config.js  —  THE ONLY FILE YOU EVER NEED TO EDIT
   --------------------------------------------------------------------------
   TO ADD NEW CLOTHES (the easy way):
     1. Save the PNG (same size as aloo.png, transparent) into the right folder:
          assets/layers/hats/        hats and head items
          assets/layers/tops/        tops, coats, dresses
          assets/layers/bottoms/     shorts, skirts, trousers
          assets/layers/overalls/    dungarees, jumpsuits, suits (they remove bottoms)
          assets/layers/hands/       mittens, gloves
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
  imageFormat: 'webp',

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
  'overalls',  // dungarees, jumpsuits: sit over tops and bottoms
  'hands',     // mittens, gloves
  'shoes',     // boots and slippers
  'neck',
  'face',
  'hats',
  'props',     // held items and foreground props
];

/* --------------------------------------------------------------------------
   CATEGORIES
     label  - the category's name (shown in the admin panel)
     rule   - 'replace' = one item at a time, 'stack' = several at once
     clears - (optional) wearing something here removes everything in these
              other categories. Example: dungarees remove any shorts.
   Categories decide the layer order and the replace/stack rules. (Tabs are set in SECTIONS.)
   -------------------------------------------------------------------------- */
const CATEGORIES = {
  background: { label: 'Backgrounds', rule: 'replace' },
  tail:       { label: 'Tail',        rule: 'stack'   },
  bottoms:    { label: 'Bottoms',     rule: 'replace' },
  tops:       { label: 'Tops',        rule: 'replace' },
  overalls:   { label: 'Suits',        rule: 'replace', clears: ['bottoms'] },
  hands:      { label: 'Hands',       rule: 'replace' },
  shoes:      { label: 'Shoes',       rule: 'replace' },
  neck:       { label: 'Neck',        rule: 'replace' },
  face:       { label: 'Face',        rule: 'replace' },
  hats:       { label: 'Hats',        rule: 'replace' },
  props:      { label: 'Props',       rule: 'stack'   },
};

/* --------------------------------------------------------------------------
   SECTIONS  —  the tabs above the carousel.
   Each section shows one or more categories (folders). The categories keep
   their own rules (e.g. you can wear a hat AND mittens AND boots), but players
   see them grouped together under one tab.
     label      - the tab name
     categories - which categories appear in it, in this order
   Reorder the sections, or move a category into another section, right here.
   -------------------------------------------------------------------------- */
const SECTIONS = [
  { label: 'Tops',        categories: ['tops'] },
  { label: 'Bottoms',     categories: ['bottoms'] },
  { label: 'Suits',       categories: ['overalls'] },
  { label: 'Accessories', categories: ['hats', 'neck', 'face', 'hands', 'shoes', 'tail', 'props'] },
  { label: 'Backgrounds', categories: ['background'] },
];

/* --------------------------------------------------------------------------
   ITEMS  —  one line per item.  Within a category, the order here is the order in the carousel.
   Move a line up or down to rearrange items (the admin panel has arrows for this too).
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
  { id: 'astrohat', category: 'hats', name: 'Astro helmet' },
  { id: 'astrosuit', category: 'overalls', name: 'Astro suit' },
  { id: 'mittens', category: 'hands', name: 'Mittens' },
  { id: 'greenback', category: 'background', name: 'Green swirls' },
  { id: 'pinkback', category: 'background', name: 'Yellow sprinkles' },
  { id: 'pinkback2', category: 'background', name: 'Leopard pink' },
  { id: 'redback', category: 'background', name: 'Snowflakes' },
  { id: 'spaceback', category: 'background', name: 'Space' },
  { id: 'tealback', category: 'background', name: 'Teal sprinkles' },

  // ▲▲ NEW ITEMS ARE ADDED ABOVE THIS LINE BY tools/build_assets.py — keep this comment ▲▲
];
