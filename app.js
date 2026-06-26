// =============================================
// CART — Shared Grocery List
// =============================================

// ── SUPABASE CONFIG ──────────────────────────
// Replace these with your actual Supabase credentials
const SUPABASE_URL = 'https://zkhkfusorbpylasmitrd.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpraGtmdXNvcmJweWxhc21pdHJkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI0NzM1NDksImV4cCI6MjA5ODA0OTU0OX0.CS3W2sqLUYu4DPKnGeUYU6DjiG8IKzYo9btMSPQETpg'

const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ── STATE ─────────────────────────────────────
let items = [];
let activeStore = 'all';
let qty = 1;
let noteOpen = false;
let subscription = null;

// ── AUTO-CATEGORIZE ───────────────────────────
const categoryMap = {
  // Produce
  Produce: ['apple','banana','orange','grape','strawberry','blueberry','raspberry','mango','pineapple','watermelon','cantaloupe','peach','pear','plum','cherry','avocado','lemon','lime','lettuce','spinach','kale','arugula','cabbage','broccoli','cauliflower','carrot','celery','cucumber','zucchini','squash','pepper','tomato','onion','garlic','potato','sweet potato','yam','mushroom','corn','asparagus','artichoke','beet','radish','green bean','pea','edamame','herb','basil','cilantro','parsley','mint','ginger','jalapeño','serrano','tomatillo'],
  // Dairy
  Dairy: ['milk','cheese','butter','yogurt','cream','sour cream','cottage cheese','cream cheese','half and half','whipping cream','egg','eggs','kefir','ghee','parmesan','mozzarella','cheddar','brie','feta','gouda','ricotta','string cheese'],
  // Meat
  Meat: ['chicken','beef','pork','turkey','lamb','salmon','tuna','shrimp','fish','bacon','ham','sausage','steak','ground beef','ground turkey','hot dog','salami','pepperoni','prosciutto','ribeye','brisket','ribs','wings','thigh','breast','tenderloin','cod','tilapia','crab','lobster','scallop','clam','oyster'],
  // Bakery
  Bakery: ['bread','tortilla','bagel','muffin','croissant','roll','bun','pita','naan','sourdough','baguette','cake','cookie','pie','pastry','donut','brownie','cupcake'],
  // Frozen
  Frozen: ['ice cream','frozen','pizza','nugget','fries','waffle','burrito','edamame frozen','veggie burger','ice','popsicle','sorbet','frozen meal','frozen dinner','frozen breakfast'],
  // Pantry
  Pantry: ['rice','pasta','noodle','cereal','oatmeal','flour','sugar','salt','pepper','oil','olive oil','vinegar','soy sauce','hot sauce','ketchup','mustard','mayo','ranch','salsa','hummus','peanut butter','jelly','jam','honey','maple syrup','canned','beans','lentil','soup','broth','stock','tomato sauce','coconut milk','cornstarch','baking soda','baking powder','vanilla','spice','seasoning','sauce'],
  // Snacks
  Snacks: ['chips','crackers','popcorn','pretzels','nuts','almonds','cashews','peanuts','trail mix','granola','granola bar','protein bar','fruit snack','gummies','candy','chocolate','dark chocolate','jerky','rice cake'],
  // Beverages
  Beverages: ['water','juice','coffee','tea','soda','beer','wine','spirits','kombucha','sports drink','energy drink','lemonade','sparkling water','almond milk','oat milk','soy milk','coconut water'],
  // Household
  Household: ['paper towel','toilet paper','tissues','trash bag','zip bag','plastic wrap','aluminum foil','dish soap','laundry','detergent','bleach','cleaner','sponge','mop','broom','vacuum','battery','light bulb','candle','air freshener','toilet cleaner','dryer sheet','fabric softener'],
  // Personal Care
  'Personal Care': ['shampoo','conditioner','body wash','soap','toothpaste','toothbrush','deodorant','lotion','sunscreen','razor','shaving','makeup','lipstick','mascara','foundation','vitamins','medicine','ibuprofen','tylenol','allergy','bandaid','cotton'],
};

function autoCategory(name) {
  const lower = name.toLowerCase();
  for (const [cat, keywords] of Object.entries(categoryMap)) {
    if (keywords.some(k => lower.includes(k))) return cat;
  }
  return 'Other';
}

// ── DOM REFS ──────────────────────────────────
const itemInput     = document.getElementById('item-input');
const btnAdd        = document.getElementById('btn-add');
const storeSelect   = document.getElementById('store-select');
const categorySelect= document.getElementById('category-select');
const qtyDisplay    = document.getElementById('qty-display');
const qtyMinus      = document.getElementById('qty-minus');
const qtyPlus       = document.getElementById('qty-plus');
const noteToggle    = document.getElementById('note-toggle');
const noteInput     = document.getElementById('note-input');
const itemDetails   = document.getElementById('item-details');
const suggestionsEl = document.getElementById('suggestions');
const aiHint        = document.getElementById('ai-hint');
const aiHintText    = document.getElementById('ai-hint-text');
const itemsList     = document.getElementById('items-list');
const emptyState    = document.getElementById('empty-state');
const listActions   = document.getElementById('list-actions');
const btnClear      = document.getElementById('btn-clear');
const modalOverlay  = document.getElementById('modal-overlay');
const modalCancel   = document.getElementById('modal-cancel');
const modalConfirm  = document.getElementById('modal-confirm');
const syncStatus    = document.getElementById('sync-status');
const storeTabs     = document.getElementById('store-tabs');

// ── STORE LABELS ──────────────────────────────
const storeLabels = {
  frys: "Fry's", costco: 'Costco', sams: "Sam's", walmart: 'Walmart', other: 'Other'
};

// ── INPUT EVENTS ──────────────────────────────
itemInput.addEventListener('input', () => {
  const val = itemInput.value.trim();
  if (val.length > 0) {
    itemDetails.style.display = 'block';
    updateSuggestions(val);
    const cat = autoCategory(val);
    categorySelect.value = cat;
    aiHint.style.display = 'flex';
    aiHintText.textContent = `Auto-categorized as "${cat}"`;
  } else {
    itemDetails.style.display = 'none';
    suggestionsEl.innerHTML = '';
    aiHint.style.display = 'none';
  }
});

itemInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') addItem();
});

btnAdd.addEventListener('click', addItem);

// Qty controls
qtyMinus.addEventListener('click', () => { if (qty > 1) { qty--; qtyDisplay.textContent = qty; } });
qtyPlus.addEventListener('click', () => { if (qty < 99) { qty++; qtyDisplay.textContent = qty; } });

// Note toggle
noteToggle.addEventListener('click', () => {
  noteOpen = !noteOpen;
  noteInput.style.display = noteOpen ? 'block' : 'none';
  noteToggle.textContent = noteOpen ? '− Remove note' : '+ Add note';
  if (noteOpen) noteInput.focus();
});

// Store tabs
storeTabs.addEventListener('click', e => {
  const tab = e.target.closest('.tab');
  if (!tab) return;
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  tab.classList.add('active');
  activeStore = tab.dataset.store;
  renderList();
});

// Clear checked
btnClear.addEventListener('click', () => { modalOverlay.style.display = 'flex'; });
modalCancel.addEventListener('click', () => { modalOverlay.style.display = 'none'; });
modalConfirm.addEventListener('click', clearChecked);

// ── SUGGESTIONS ───────────────────────────────
function updateSuggestions(val) {
  const lower = val.toLowerCase();
  const past = [...new Set(items.map(i => i.name))]
    .filter(n => n.toLowerCase().includes(lower) && n.toLowerCase() !== lower)
    .slice(0, 5);

  suggestionsEl.innerHTML = '';
  past.forEach(name => {
    const chip = document.createElement('button');
    chip.className = 'suggestion-chip';
    chip.textContent = name;
    chip.addEventListener('click', () => {
      itemInput.value = name;
      const cat = autoCategory(name);
      categorySelect.value = cat;
      itemDetails.style.display = 'block';
      aiHint.style.display = 'flex';
      aiHintText.textContent = `Auto-categorized as "${cat}"`;
      suggestionsEl.innerHTML = '';
    });
    suggestionsEl.appendChild(chip);
  });
}

// ── ADD ITEM ──────────────────────────────────
async function addItem() {
  const name = itemInput.value.trim();
  if (!name) return;

  const newItem = {
    name,
    store: storeSelect.value,
    category: categorySelect.value,
    quantity: qty,
    note: noteOpen ? noteInput.value.trim() : '',
    checked: false,
    created_at: new Date().toISOString(),
  };

  const { error } = await db.from('grocery_items').insert(newItem);
  if (error) { console.error(error); return; }

  // Reset form
  itemInput.value = '';
  itemDetails.style.display = 'none';
  suggestionsEl.innerHTML = '';
  aiHint.style.display = 'none';
  qty = 1;
  qtyDisplay.textContent = '1';
  noteOpen = false;
  noteInput.style.display = 'none';
  noteInput.value = '';
  noteToggle.textContent = '+ Add note';
  itemInput.focus();
}

// ── TOGGLE CHECK ──────────────────────────────
async function toggleCheck(id, current) {
  await db.from('grocery_items').update({ checked: !current }).eq('id', id);
}

// ── DELETE ITEM ───────────────────────────────
async function deleteItem(id) {
  await db.from('grocery_items').delete().eq('id', id);
}

// ── CLEAR CHECKED ─────────────────────────────
async function clearChecked() {
  modalOverlay.style.display = 'none';
  const checkedIds = items.filter(i => i.checked).map(i => i.id);
  if (checkedIds.length === 0) return;
  await db.from('grocery_items').delete().in('id', checkedIds);
}

// ── RENDER LIST ───────────────────────────────
function renderList() {
  const filtered = activeStore === 'all'
    ? items
    : items.filter(i => i.store === activeStore);

  const hasChecked = filtered.some(i => i.checked);
  listActions.style.display = hasChecked ? 'block' : 'none';
  emptyState.style.display = filtered.length === 0 ? 'block' : 'none';

  // Sort: unchecked first, then by category
  const sorted = [...filtered].sort((a, b) => {
    if (a.checked !== b.checked) return a.checked ? 1 : -1;
    if (a.category < b.category) return -1;
    if (a.category > b.category) return 1;
    return 0;
  });

  // Group by category
  const groups = {};
  sorted.forEach(item => {
    if (!groups[item.category]) groups[item.category] = [];
    groups[item.category].push(item);
  });

  itemsList.innerHTML = '';

  Object.entries(groups).forEach(([cat, catItems]) => {
    const group = document.createElement('div');
    group.className = 'category-group';

    const label = document.createElement('span');
    label.className = 'category-label';
    label.textContent = cat;
    group.appendChild(label);

    catItems.forEach(item => {
      const row = document.createElement('div');
      row.className = `item-row${item.checked ? ' checked' : ''}`;

      const dot = document.createElement('div');
      dot.className = `store-dot ${item.store}`;

      const check = document.createElement('button');
      check.className = `item-check${item.checked ? ' checked' : ''}`;
      check.innerHTML = item.checked ? '✓' : '';
      check.setAttribute('aria-label', item.checked ? 'Uncheck' : 'Check off');
      check.addEventListener('click', () => toggleCheck(item.id, item.checked));

      const info = document.createElement('div');
      info.className = 'item-info';

      const nameEl = document.createElement('div');
      nameEl.className = 'item-name';
      nameEl.textContent = item.quantity > 1 ? `${item.name} ×${item.quantity}` : item.name;

      info.appendChild(nameEl);

      if (item.note) {
        const noteEl = document.createElement('div');
        noteEl.className = 'item-note';
        noteEl.textContent = item.note;
        info.appendChild(noteEl);
      }

      const storeTag = document.createElement('span');
      storeTag.className = `item-store-tag ${item.store}`;
      storeTag.textContent = storeLabels[item.store] || item.store;

      const del = document.createElement('button');
      del.className = 'item-delete';
      del.innerHTML = '×';
      del.setAttribute('aria-label', 'Remove item');
      del.addEventListener('click', () => deleteItem(item.id));

      row.appendChild(dot);
      row.appendChild(check);
      row.appendChild(info);
      if (activeStore === 'all') row.appendChild(storeTag);
      row.appendChild(del);
      group.appendChild(row);
    });

    itemsList.appendChild(group);
  });
}

// ── SUPABASE REALTIME ─────────────────────────
async function loadItems() {
  const { data, error } = await db.from('grocery_items').select('*').order('created_at', { ascending: true });
  if (error) {
    syncStatus.textContent = '⚠ Connection error';
    return;
  }
  items = data || [];
  syncStatus.textContent = '● Live';
  renderList();
}

function subscribeRealtime() {
  subscription = db
    .channel('grocery_items_changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'grocery_items' }, payload => {
      if (payload.eventType === 'INSERT') {
        items.push(payload.new);
      } else if (payload.eventType === 'UPDATE') {
        const idx = items.findIndex(i => i.id === payload.new.id);
        if (idx !== -1) items[idx] = payload.new;
      } else if (payload.eventType === 'DELETE') {
        items = items.filter(i => i.id !== payload.old.id);
      }
      renderList();
    })
    .subscribe(status => {
      if (status === 'SUBSCRIBED') syncStatus.textContent = '● Live';
      else syncStatus.textContent = 'Reconnecting...';
    });
}

// ── INIT ──────────────────────────────────────
loadItems();
subscribeRealtime();
