// =============================================
// CART v2 — Shared Grocery List
// =============================================

const SUPABASE_URL = 'https://zkhkfusorbpylasmitrd.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpraGtmdXNvcmJweWxhc21pdHJkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI0NzM1NDksImV4cCI6MjA5ODA0OTU0OX0.CS3W2sqLUYu4DPKnGeUYU6DjiG8IKzYo9btMSPQETpg'


const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ── STATE ─────────────────────────────────────
let items = [];
let activeStore = 'all';
let qty = 1;
let editQty = 1;
let noteOpen = false;
let orOpen = false;
let editOrOpen = false;
let editingItem = null;
let customStores = JSON.parse(localStorage.getItem('customStores') || '[]');

// ── BUILT-IN STORES ───────────────────────────
const builtInStores = [
  { id: 'frys',    label: "Fry's" },
  { id: 'costco',  label: 'Costco' },
  { id: 'sams',    label: "Sam's" },
  { id: 'walmart', label: 'Walmart' },
  { id: 'target',  label: 'Target' },
  { id: 'other',   label: 'Other' },
];

function getAllStores() {
  return [
    ...builtInStores,
    ...customStores.map(s => ({ id: s.id, label: s.label }))
  ];
}

function getStoreLabel(id) {
  const store = getAllStores().find(s => s.id === id);
  return store ? store.label : id;
}

function getStoreClass(id) {
  if (builtInStores.find(s => s.id === id)) return id;
  return 'custom';
}

// ── AUTO-CATEGORIZE ───────────────────────────
const categoryMap = {
  Produce: ['apple','banana','orange','grape','strawberry','blueberry','raspberry','mango','pineapple','watermelon','cantaloupe','peach','pear','plum','cherry','avocado','lemon','lime','lettuce','spinach','kale','arugula','cabbage','broccoli','cauliflower','carrot','celery','cucumber','zucchini','squash','pepper','tomato','onion','garlic','potato','sweet potato','yam','mushroom','corn','asparagus','artichoke','beet','radish','green bean','pea','edamame','herb','basil','cilantro','parsley','mint','ginger','jalapeño','serrano','tomatillo'],
  Dairy: ['milk','cheese','butter','yogurt','cream','sour cream','cottage cheese','cream cheese','half and half','whipping cream','egg','eggs','kefir','ghee','parmesan','mozzarella','cheddar','brie','feta','gouda','ricotta','string cheese'],
  Meat: ['chicken','beef','pork','turkey','lamb','salmon','tuna','shrimp','fish','bacon','ham','sausage','steak','ground beef','ground turkey','hot dog','salami','pepperoni','prosciutto','ribeye','brisket','ribs','wings','thigh','breast','tenderloin','cod','tilapia','crab','lobster','scallop','clam','oyster'],
  Bakery: ['bread','tortilla','bagel','muffin','croissant','roll','bun','pita','naan','sourdough','baguette','cake','cookie','pie','pastry','donut','brownie','cupcake'],
  Frozen: ['ice cream','frozen','pizza','nugget','fries','waffle','burrito','veggie burger','ice','popsicle','sorbet','frozen meal','frozen dinner','frozen breakfast'],
  Pantry: ['rice','pasta','noodle','cereal','oatmeal','flour','sugar','salt','pepper','oil','olive oil','vinegar','soy sauce','hot sauce','ketchup','mustard','mayo','ranch','salsa','hummus','peanut butter','jelly','jam','honey','maple syrup','canned','beans','lentil','soup','broth','stock','tomato sauce','coconut milk','cornstarch','baking soda','baking powder','vanilla','spice','seasoning','sauce'],
  Snacks: ['chips','crackers','popcorn','pretzels','nuts','almonds','cashews','peanuts','trail mix','granola','granola bar','protein bar','fruit snack','gummies','candy','chocolate','dark chocolate','jerky','rice cake'],
  Beverages: ['water','juice','coffee','tea','soda','beer','wine','spirits','kombucha','sports drink','energy drink','lemonade','sparkling water','almond milk','oat milk','soy milk','coconut water'],
  Household: ['paper towel','toilet paper','tissues','trash bag','zip bag','plastic wrap','aluminum foil','dish soap','laundry','detergent','bleach','cleaner','sponge','mop','broom','vacuum','battery','light bulb','candle','air freshener','toilet cleaner','dryer sheet','fabric softener'],
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
const itemInput      = document.getElementById('item-input');
const btnAdd         = document.getElementById('btn-add');
const storeSelect    = document.getElementById('store-select');
const storeSelect2   = document.getElementById('store-select-2');
const store2Group    = document.getElementById('store2-group');
const categorySelect = document.getElementById('category-select');
const qtyDisplay     = document.getElementById('qty-display');
const qtyMinus       = document.getElementById('qty-minus');
const qtyPlus        = document.getElementById('qty-plus');
const noteToggle     = document.getElementById('note-toggle');
const noteInput      = document.getElementById('note-input');
const orToggle       = document.getElementById('or-toggle');
const itemDetails    = document.getElementById('item-details');
const suggestionsEl  = document.getElementById('suggestions');
const aiHint         = document.getElementById('ai-hint');
const aiHintText     = document.getElementById('ai-hint-text');
const itemsList      = document.getElementById('items-list');
const emptyState     = document.getElementById('empty-state');
const listActions    = document.getElementById('list-actions');
const btnClear       = document.getElementById('btn-clear');
const modalOverlay   = document.getElementById('modal-overlay');
const modalCancel    = document.getElementById('modal-cancel');
const modalConfirm   = document.getElementById('modal-confirm');
const syncStatus     = document.getElementById('sync-status');
const storeTabsEl    = document.getElementById('store-tabs');
const btnAddStore    = document.getElementById('btn-add-store');

// Edit modal
const editModal      = document.getElementById('edit-modal');
const editName       = document.getElementById('edit-name');
const editStore      = document.getElementById('edit-store');
const editStore2     = document.getElementById('edit-store2');
const editStore2Group= document.getElementById('edit-store2-group');
const editAddOr      = document.getElementById('edit-add-or');
const removeOr       = document.getElementById('remove-or');
const editCategory   = document.getElementById('edit-category');
const editQtyDisplay = document.getElementById('edit-qty-display');
const editQtyMinus   = document.getElementById('edit-qty-minus');
const editQtyPlus    = document.getElementById('edit-qty-plus');
const editNote       = document.getElementById('edit-note');
const editCancel     = document.getElementById('edit-cancel');
const editSave       = document.getElementById('edit-save');

// Store modal
const storeModal        = document.getElementById('store-modal');
const newStoreInput     = document.getElementById('new-store-input');
const storeModalCancel  = document.getElementById('store-modal-cancel');
const storeModalConfirm = document.getElementById('store-modal-confirm');

// ── RENDER TABS ───────────────────────────────
function renderTabs() {
  storeTabsEl.innerHTML = '';

  const allTab = document.createElement('button');
  allTab.className = `tab${activeStore === 'all' ? ' active' : ''}`;
  allTab.dataset.store = 'all';
  allTab.textContent = 'All';
  storeTabsEl.appendChild(allTab);

  getAllStores().forEach(store => {
    const tab = document.createElement('button');
    const cls = getStoreClass(store.id);
    tab.className = `tab tab--${cls}${activeStore === store.id ? ' active' : ''}`;
    tab.dataset.store = store.id;
    tab.textContent = store.label;
    storeTabsEl.appendChild(tab);
  });

  storeTabsEl.addEventListener('click', e => {
    const tab = e.target.closest('.tab');
    if (!tab) return;
    activeStore = tab.dataset.store;
    renderTabs();
    // Pre-select store in add form
    if (activeStore !== 'all') {
      storeSelect.value = activeStore;
    }
    renderList();
  });
}

// ── POPULATE STORE SELECTS ────────────────────
function populateStoreSelects() {
  const stores = getAllStores();
  [storeSelect, storeSelect2, editStore, editStore2].forEach(sel => {
    const current = sel.value;
    sel.innerHTML = '';
    stores.forEach(s => {
      const opt = document.createElement('option');
      opt.value = s.id;
      opt.textContent = s.label;
      sel.appendChild(opt);
    });
    if (current) sel.value = current;
  });
  // Pre-select active store
  if (activeStore !== 'all') storeSelect.value = activeStore;
}

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

itemInput.addEventListener('keydown', e => { if (e.key === 'Enter') addItem(); });
btnAdd.addEventListener('click', addItem);

qtyMinus.addEventListener('click', () => { if (qty > 1) { qty--; qtyDisplay.textContent = qty; } });
qtyPlus.addEventListener('click', () => { if (qty < 99) { qty++; qtyDisplay.textContent = qty; } });

noteToggle.addEventListener('click', () => {
  noteOpen = !noteOpen;
  noteInput.style.display = noteOpen ? 'block' : 'none';
  noteToggle.textContent = noteOpen ? '− Remove note' : '+ Add note';
  if (noteOpen) noteInput.focus();
});

orToggle.addEventListener('click', () => {
  orOpen = !orOpen;
  store2Group.style.display = orOpen ? 'block' : 'none';
  orToggle.textContent = orOpen ? '− Remove "or" store' : '+ Add "or" store';
});

btnClear.addEventListener('click', () => { modalOverlay.style.display = 'flex'; });
modalCancel.addEventListener('click', () => { modalOverlay.style.display = 'none'; });
modalConfirm.addEventListener('click', clearChecked);

// ── ADD STORE ─────────────────────────────────
btnAddStore.addEventListener('click', () => {
  newStoreInput.value = '';
  storeModal.style.display = 'flex';
  setTimeout(() => newStoreInput.focus(), 100);
});
storeModalCancel.addEventListener('click', () => { storeModal.style.display = 'none'; });
newStoreInput.addEventListener('keydown', e => { if (e.key === 'Enter') confirmAddStore(); });
storeModalConfirm.addEventListener('click', confirmAddStore);

function confirmAddStore() {
  const name = newStoreInput.value.trim();
  if (!name) return;
  const id = name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
  if (getAllStores().find(s => s.id === id)) {
    alert('A store with that name already exists!');
    return;
  }
  customStores.push({ id, label: name });
  localStorage.setItem('customStores', JSON.stringify(customStores));
  storeModal.style.display = 'none';
  populateStoreSelects();
  renderTabs();
}

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

  const store2Val = orOpen ? storeSelect2.value : null;

  const newItem = {
    name,
    store: storeSelect.value,
    store2: store2Val || null,
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
  qty = 1; qtyDisplay.textContent = '1';
  noteOpen = false; noteInput.style.display = 'none'; noteInput.value = ''; noteToggle.textContent = '+ Add note';
  orOpen = false; store2Group.style.display = 'none'; orToggle.textContent = '+ Add "or" store';
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

// ── EDIT ITEM ─────────────────────────────────
function openEdit(item) {
  editingItem = item;
  editQty = item.quantity || 1;
  editName.value = item.name;
  editCategory.value = item.category;
  editQtyDisplay.textContent = editQty;
  editNote.value = item.note || '';
  populateStoreSelects();
  editStore.value = item.store;

  if (item.store2) {
    editOrOpen = true;
    editStore2Group.style.display = 'block';
    editAddOr.style.display = 'none';
    editStore2.value = item.store2;
  } else {
    editOrOpen = false;
    editStore2Group.style.display = 'none';
    editAddOr.style.display = 'block';
  }

  editModal.style.display = 'flex';
}

editQtyMinus.addEventListener('click', () => { if (editQty > 1) { editQty--; editQtyDisplay.textContent = editQty; } });
editQtyPlus.addEventListener('click', () => { if (editQty < 99) { editQty++; editQtyDisplay.textContent = editQty; } });

editAddOr.addEventListener('click', () => {
  editOrOpen = true;
  editStore2Group.style.display = 'block';
  editAddOr.style.display = 'none';
  populateStoreSelects();
});

removeOr.addEventListener('click', () => {
  editOrOpen = false;
  editStore2Group.style.display = 'none';
  editAddOr.style.display = 'block';
});

editCancel.addEventListener('click', () => { editModal.style.display = 'none'; editingItem = null; });

editSave.addEventListener('click', async () => {
  if (!editingItem) return;
  const updated = {
    name: editName.value.trim(),
    store: editStore.value,
    store2: editOrOpen ? editStore2.value : null,
    category: editCategory.value,
    quantity: editQty,
    note: editNote.value.trim(),
  };
  await db.from('grocery_items').update(updated).eq('id', editingItem.id);
  editModal.style.display = 'none';
  editingItem = null;
});

// ── RENDER LIST ───────────────────────────────
function renderList() {
  // Filter by active store — items show if store OR store2 matches
  const filtered = activeStore === 'all'
    ? items
    : items.filter(i => i.store === activeStore || i.store2 === activeStore);

  const hasChecked = filtered.some(i => i.checked);
  listActions.style.display = hasChecked ? 'block' : 'none';
  emptyState.style.display = filtered.length === 0 ? 'block' : 'none';

  const sorted = [...filtered].sort((a, b) => {
    if (a.checked !== b.checked) return a.checked ? 1 : -1;
    if (a.category < b.category) return -1;
    if (a.category > b.category) return 1;
    return 0;
  });

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

      // Primary store dot
      const dot = document.createElement('div');
      dot.className = `store-dot ${getStoreClass(item.store)}`;

      // Checkbox
      const check = document.createElement('button');
      check.className = `item-check${item.checked ? ' checked' : ''}`;
      check.innerHTML = item.checked ? '✓' : '';
      check.addEventListener('click', () => toggleCheck(item.id, item.checked));

      // Info
      const info = document.createElement('div');
      info.className = 'item-info';

      const nameEl = document.createElement('div');
      nameEl.className = 'item-name';
      nameEl.textContent = item.quantity > 1 ? `${item.name} ×${item.quantity}` : item.name;
      info.appendChild(nameEl);

      // Store tags + OR
      const meta = document.createElement('div');
      meta.className = 'item-meta';

      if (activeStore === 'all' || item.store2) {
        const tag1 = document.createElement('span');
        tag1.className = `item-store-tag ${getStoreClass(item.store)}`;
        tag1.textContent = getStoreLabel(item.store);
        meta.appendChild(tag1);

        if (item.store2) {
          const orDiv = document.createElement('span');
          orDiv.className = 'or-divider';
          orDiv.textContent = 'or';
          meta.appendChild(orDiv);

          const tag2 = document.createElement('span');
          tag2.className = `item-store-tag ${getStoreClass(item.store2)}`;
          tag2.textContent = getStoreLabel(item.store2);
          meta.appendChild(tag2);
        }
      }

      if (item.note) {
        const noteEl = document.createElement('span');
        noteEl.className = 'item-note';
        noteEl.textContent = item.note;
        meta.appendChild(noteEl);
      }

      if (meta.children.length > 0) info.appendChild(meta);

      // Actions
      const actions = document.createElement('div');
      actions.className = 'item-actions';

      const editBtn = document.createElement('button');
      editBtn.className = 'item-edit';
      editBtn.innerHTML = '✏️';
      editBtn.setAttribute('aria-label', 'Edit item');
      editBtn.addEventListener('click', () => openEdit(item));

      const del = document.createElement('button');
      del.className = 'item-delete';
      del.innerHTML = '×';
      del.setAttribute('aria-label', 'Remove item');
      del.addEventListener('click', () => deleteItem(item.id));

      actions.appendChild(editBtn);
      actions.appendChild(del);

      row.appendChild(dot);
      row.appendChild(check);
      row.appendChild(info);
      row.appendChild(actions);
      group.appendChild(row);
    });

    itemsList.appendChild(group);
  });
}

// ── SUPABASE REALTIME ─────────────────────────
async function loadItems() {
  const { data, error } = await db.from('grocery_items').select('*').order('created_at', { ascending: true });
  if (error) { syncStatus.textContent = '⚠ Connection error'; return; }
  items = data || [];
  syncStatus.textContent = '● Live';
  renderList();
}

function subscribeRealtime() {
  db.channel('grocery_items_changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'grocery_items' }, payload => {
      if (payload.eventType === 'INSERT') items.push(payload.new);
      else if (payload.eventType === 'UPDATE') {
        const idx = items.findIndex(i => i.id === payload.new.id);
        if (idx !== -1) items[idx] = payload.new;
      } else if (payload.eventType === 'DELETE') {
        items = items.filter(i => i.id !== payload.old.id);
      }
      renderList();
    })
    .subscribe(status => {
      syncStatus.textContent = status === 'SUBSCRIBED' ? '● Live' : 'Reconnecting...';
    });
}

// ── INIT ──────────────────────────────────────
populateStoreSelects();
renderTabs();
loadItems();
subscribeRealtime();
