'use strict';

const DEFAULT_SETTINGS = {
	theme: 'dark',
	bg: '#1f1f23',
	fg: '#ffffff',
	accent: '#ffffff',
	font: "'Inter', sans-serif",
	scale: 1.0,
	secScale: 0.4,
	foldersPerRow: 3,
	showSeconds: false,
	showIcons: true,
	folderOrder: '',
	userNameFull: '',
	tabTitle: 'Mero Tab',
	sepMargin: 10,
	secSepMargin: 5,
	textAlign: 'right',
	settingsOpacity: 0.4,
	clockOpacity: 0.85,
	fontCustom: '',
	clockFormat: '24h'
};

let settings = { ...DEFAULT_SETTINGS };
let currentDigits = { h1: '', h2: '', m1: '', m2: '', s1: '', s2: '' };

const elements = {
	body: document.body,
	greeting: document.getElementById('greeting'),
	date: document.getElementById('date-subtitle'),
	bookmarksRoot: document.getElementById('bookmarks-root'),
	settingsToggle: document.getElementById('settings-toggle'),
	settingsPanel: document.getElementById('settings-panel'),
	resetButton: document.getElementById('reset-settings'),
	themeSelect: document.getElementById('setting-theme'),
	bgInput: document.getElementById('setting-bg'),
	accentInput: document.getElementById('setting-accent'),
	fgInput: document.getElementById('setting-fg'),
	fontSelect: document.getElementById('setting-font'),
	scaleInput: document.getElementById('setting-scale'),
	secScaleInput: document.getElementById('setting-sec-scale'),
	clockOpacityInput: document.getElementById('setting-clock-opacity'),
	valClockOpacity: document.getElementById('val-clock-opacity'),
	foldersPerRowInput: document.getElementById('setting-folders-per-row'),
	showSecToggle: document.getElementById('setting-show-sec'),
	iconsToggle: document.getElementById('setting-icons'),
	valScale: document.getElementById('val-scale'),
	valSecScale: document.getElementById('val-sec-scale'),
	valFoldersPerRow: document.getElementById('val-folders-per-row'),
	sepMarginInput: document.getElementById('setting-sep-margin'),
	valSepMargin: document.getElementById('val-sep-margin'),
	secSepMarginInput: document.getElementById('setting-sec-sep-margin'),
	valSecSepMargin: document.getElementById('val-sec-sep-margin'),
	textAlignSelect: document.getElementById('setting-text-align'),
	settingsOpacityInput: document.getElementById('setting-settings-opacity'),
	valSettingsOpacity: document.getElementById('val-settings-opacity'),
	tabTitleInput: document.getElementById('setting-tab-title'),
	customFontContainer: document.getElementById('custom-font-container'),
	customFontInput: document.getElementById('setting-font-custom'),
	clockFormatSelect: document.getElementById('setting-clock-format'),
	timeContainer: document.getElementById('time-large'),
	secondsContainer: document.getElementById('seconds-container'),
	digits: {
		h1: document.getElementById('hour-1'),
		h2: document.getElementById('hour-2'),
		m1: document.getElementById('min-1'),
		m2: document.getElementById('min-2'),
		s1: document.getElementById('sec-1'),
		s2: document.getElementById('sec-2')
	}
};

async function init() {
	try {
		await loadSettings();
		applySettings();
		updateClock(true);
		setInterval(updateClock, 1000);
		loadBookmarks();
		setupEventListeners();
	} catch (e) {
		console.error('Mero Tab: Initialization failed', e);
	}
}

function updateClock(immediate = false) {
	const now = new Date();
	let hours = now.getHours();
	if (settings.clockFormat === '12h') {
		hours = hours % 12 || 12;
	}
	const hoursStr = String(hours).padStart(2, '0');
	const minutes = String(now.getMinutes()).padStart(2, '0');
	const seconds = String(now.getSeconds()).padStart(2, '0');

	const newDigits = {
		h1: hoursStr[0], h2: hoursStr[1],
		m1: minutes[0], m2: minutes[1],
		s1: seconds[0], s2: seconds[1]
	};

	for (const key in newDigits) {
		if (newDigits[key] !== currentDigits[key]) {
			flipDigit(elements.digits[key], newDigits[key], immediate);
			currentDigits[key] = newDigits[key];
		}
	}

	if (elements.date) {
		elements.date.textContent = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
	}
}

function flipDigit(el, newValue, immediate) {
	if (!el) return;
	if (immediate) {
		el.textContent = newValue;
		return;
	}
	el.classList.add('flipping');
	setTimeout(() => {
		el.textContent = newValue;
		el.classList.remove('flipping');
	}, 200);
}

async function loadSettings() {
	return new Promise((resolve) => {
		try {
			if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
				chrome.storage.sync.get(DEFAULT_SETTINGS, (items) => {
					settings = { ...DEFAULT_SETTINGS, ...items };
					resolve();
				});
			} else {
				const saved = localStorage.getItem('mero_settings');
				if (saved) settings = { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
				resolve();
			}
		} catch (e) {
			console.warn('Mero Tab: Could not load settings, using defaults', e);
			resolve();
		}
	});
}

function saveSettings() {
	try {
		if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
			chrome.storage.sync.set(settings);
		} else {
			localStorage.setItem('mero_settings', JSON.stringify(settings));
		}
	} catch (e) {
		console.error('Mero Tab: Failed to save settings', e);
	}
	applySettings();
}

function applySettings() {
	const root = document.documentElement;
	if (!root) return;

	if (settings.theme === 'dark') {
		settings.bg = '#1f1f23'; settings.fg = '#ffffff'; settings.accent = '#ffffff';
	} else if (settings.theme === 'light') {
		settings.bg = '#ffffff'; settings.fg = '#000000'; settings.accent = '#000000';
	} else if (settings.theme === 'everforest') {
		settings.bg = '#2d353b'; settings.fg = '#d3c6aa'; settings.accent = '#a7c080';
	} else if (settings.theme === 'gruvbox') {
		settings.bg = '#282828'; settings.fg = '#ebdbb2'; settings.accent = '#fabd2f';
	} else if (settings.theme === 'dracula') {
		settings.bg = '#282a36'; settings.fg = '#f8f8f2'; settings.accent = '#bd93f9';
	}

	root.style.setProperty('--bg', settings.bg);
	root.style.setProperty('--fg', settings.fg);
	root.style.setProperty('--accent', settings.accent);

	let fontToApply = settings.font;
	if (settings.font === 'custom') {
		fontToApply = settings.fontCustom || "'Inter', sans-serif";
		if (elements.customFontContainer) elements.customFontContainer.style.display = 'flex';
	} else {
		if (elements.customFontContainer) elements.customFontContainer.style.display = 'none';
	}
	root.style.setProperty('--font-main', fontToApply);
	root.style.setProperty('--scale', settings.scale ?? 1.0);
	root.style.setProperty('--sec-scale', settings.secScale ?? 0.4);
	root.style.setProperty('--folders-per-row', settings.foldersPerRow ?? 3);
	root.style.setProperty('--sep-margin', (settings.sepMargin ?? 10) + 'px');
	root.style.setProperty('--sec-sep-margin', (settings.secSepMargin ?? 5) + 'px');

	let flexAlign = 'flex-start';
	if (settings.textAlign === 'center') flexAlign = 'center';
	if (settings.textAlign === 'right') flexAlign = 'flex-end';
	root.style.setProperty('--text-align', flexAlign);

	root.style.setProperty('--settings-trigger-opacity', settings.settingsOpacity ?? 0.4);
	root.style.setProperty('--clock-opacity', settings.clockOpacity ?? 0.85);

	if (elements.timeContainer) {
		elements.timeContainer.style.opacity = settings.clockOpacity ?? 0.85;
	}

	if (elements.secondsContainer) {
		elements.secondsContainer.style.display = settings.showSeconds ? 'flex' : 'none';
	}

	if (elements.themeSelect) elements.themeSelect.value = settings.theme;
	if (elements.bgInput) elements.bgInput.value = settings.bg;
	if (elements.accentInput) elements.accentInput.value = settings.accent;
	if (elements.fgInput) elements.fgInput.value = settings.fg;
	if (elements.fontSelect) elements.fontSelect.value = settings.font;
	if (elements.scaleInput) elements.scaleInput.value = settings.scale;
	if (elements.secScaleInput) elements.secScaleInput.value = settings.secScale;
	if (elements.clockOpacityInput) elements.clockOpacityInput.value = settings.clockOpacity;
	if (elements.foldersPerRowInput) elements.foldersPerRowInput.value = settings.foldersPerRow;
	if (elements.showSecToggle) elements.showSecToggle.checked = settings.showSeconds;
	if (elements.iconsToggle) elements.iconsToggle.checked = settings.showIcons;
	if (elements.sepMarginInput) elements.sepMarginInput.value = settings.sepMargin;
	if (elements.secSepMarginInput) elements.secSepMarginInput.value = settings.secSepMargin;
	if (elements.textAlignSelect) elements.textAlignSelect.value = settings.textAlign;
	if (elements.settingsOpacityInput) elements.settingsOpacityInput.value = settings.settingsOpacity;
	if (elements.customFontInput) elements.customFontInput.value = settings.fontCustom || '';
	if (elements.clockFormatSelect) elements.clockFormatSelect.value = settings.clockFormat;

	if (elements.valScale) elements.valScale.textContent = (settings.scale ?? 1.0).toFixed(1);
	if (elements.valSecScale) elements.valSecScale.textContent = (settings.secScale ?? 0.4).toFixed(2);
	if (elements.valClockOpacity) elements.valClockOpacity.textContent = (settings.clockOpacity ?? 0.85).toFixed(2);
	if (elements.valFoldersPerRow) elements.valFoldersPerRow.textContent = settings.foldersPerRow ?? 3;
	if (elements.valSepMargin) elements.valSepMargin.textContent = settings.sepMargin ?? 10;
	if (elements.valSecSepMargin) elements.valSecSepMargin.textContent = settings.secSepMargin ?? 5;
	if (elements.valSettingsOpacity) elements.valSettingsOpacity.textContent = (settings.settingsOpacity ?? 0.4).toFixed(2);

	if (elements.tabTitleInput) elements.tabTitleInput.value = settings.tabTitle || 'Mero Tab';

	if (settings.tabTitle) document.title = settings.tabTitle;

	if (settings.userNameFull && elements.greeting) {
		elements.greeting.textContent = settings.userNameFull;
	}
}

function loadBookmarks() {
	if (typeof chrome === 'undefined' || !chrome.bookmarks) {
		renderDummyBookmarks();
		return;
	}
	try {
		chrome.bookmarks.getTree((rootNodes) => {
			if (!rootNodes || !rootNodes[0]) return;
			const rootNode = rootNodes[0].children.find(c => c.id === '1') || rootNodes[0].children[0];
			renderBookmarks(rootNode);
		});
	} catch (e) {
		console.warn('Mero Tab: Could not load bookmarks', e);
		renderDummyBookmarks();
	}
}

function renderBookmarks(rootNode) {
	if (!elements.bookmarksRoot) return;
	elements.bookmarksRoot.innerHTML = '';
	const grid = document.createElement('div');
	grid.className = 'bookmarks-grid';

	const folderMap = new Map();
	let topItems = [];

	if (rootNode.children) {
		rootNode.children.forEach(child => {
			if (child.children) folderMap.set(child.title.toLowerCase().trim(), child);
			else topItems.push(child);
		});
	}

	if (topItems.length > 0) folderMap.set('bookmarks', { title: 'Bookmarks', children: topItems, id: 'virtual-root' });

	const customOrder = (settings.folderOrder || '').split('\n').map(s => s.trim().toLowerCase()).filter(s => s);
	let finalFolders = [];
	customOrder.forEach(title => {
		if (folderMap.has(title)) { finalFolders.push(folderMap.get(title)); folderMap.delete(title); }
	});
	folderMap.forEach(folder => finalFolders.push(folder));

	finalFolders.forEach(folder => {
		const group = document.createElement('div');
		group.className = 'folder-group';
		group.draggable = true;
		group.dataset.title = folder.title;
		group.dataset.id = folder.id;

		const title = document.createElement('div');
		title.className = 'folder-title';
		title.textContent = folder.title;
		group.appendChild(title);

		if (folder.children) {
			folder.children.forEach(bm => {
				if (bm.url) {
					const link = document.createElement('a');
					link.className = 'bookmark-item';
					link.href = bm.url;
					link.draggable = true;
					link.dataset.id = bm.id;

					if (settings.showIcons) {
						const icon = document.createElement('img');
						try {
							icon.src = `chrome-extension://${chrome.runtime.id}/_favicon/?pageUrl=${encodeURIComponent(bm.url)}&size=16`;
						} catch (e) {
							icon.src = '';
						}
						link.appendChild(icon);
					}

					const text = document.createElement('span');
					text.textContent = bm.title || bm.url;
					link.appendChild(text);
					group.appendChild(link);
				}
			});
		}
		setupDragEvents(group, 'folder');
		group.querySelectorAll('.bookmark-item').forEach(item => setupDragEvents(item, 'bookmark'));
		grid.appendChild(group);
	});
	elements.bookmarksRoot.appendChild(grid);
}

let draggedElement = null;
let draggedType = null;

function setupDragEvents(el, type) {
	if (!el) return;
	el.addEventListener('dragstart', (e) => {
		draggedElement = el; draggedType = type;
		el.classList.add('dragging');
		e.stopPropagation();
		const img = new Image();
		img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
		e.dataTransfer.setDragImage(img, 0, 0);
	});
	el.addEventListener('dragend', () => {
		el.classList.remove('dragging');
		document.querySelectorAll('.drag-over').forEach(d => d.classList.remove('drag-over'));
		draggedElement = null;
	});
	el.addEventListener('dragover', (e) => {
		if (draggedType !== type) return;
		e.preventDefault(); e.stopPropagation();
		el.classList.add('drag-over');
	});
	el.addEventListener('dragleave', (e) => {
		el.classList.remove('drag-over');
	});
	el.addEventListener('drop', (e) => {
		e.preventDefault(); e.stopPropagation();
		el.classList.remove('drag-over');
		if (draggedType !== type || draggedElement === el) return;
		if (type === 'folder') reorderFolders(draggedElement, el);
		else reorderBookmarks(draggedElement, el);
	});
}

function reorderFolders(dragged, target) {
	const grid = dragged.parentNode;
	if (!grid) return;
	const folders = Array.from(grid.children);
	if (folders.indexOf(dragged) < folders.indexOf(target)) target.after(dragged);
	else target.before(dragged);
	settings.folderOrder = Array.from(grid.children).map(f => f.dataset.title).join('\n');
	saveSettings();
}

function reorderBookmarks(dragged, target) {
	if (dragged.nextSibling === target) target.after(dragged);
	else target.before(dragged);
	if (typeof chrome !== 'undefined' && chrome.bookmarks) {
		try {
			chrome.bookmarks.get(target.dataset.id, (nodes) => {
				if (nodes && nodes[0]) {
					chrome.bookmarks.move(dragged.dataset.id, { parentId: nodes[0].parentId, index: nodes[0].index }, () => loadBookmarks());
				}
			});
		} catch (e) { }
	}
}

function renderDummyBookmarks() {
	if (elements.bookmarksRoot) {
		elements.bookmarksRoot.innerHTML = '<div class="bookmarks-grid"><div class="folder-group"><div class="folder-title">Sample</div><a class="bookmark-item" href="https://google.com">Google</a></div></div>';
	}
}

function setupEventListeners() {
	const h = (k, v) => { settings[k] = v; saveSettings(); };

	if (elements.settingsToggle) {
		elements.settingsToggle.onclick = (e) => {
			e.stopPropagation();
			elements.settingsPanel && elements.settingsPanel.classList.toggle('open');
		};
	}

	document.addEventListener('click', (e) => {
		if (elements.settingsPanel && elements.settingsPanel.classList.contains('open')) {
			if (!elements.settingsPanel.contains(e.target) && e.target !== elements.settingsToggle) {
				elements.settingsPanel.classList.remove('open');
			}
		}
	});

	if (elements.themeSelect) elements.themeSelect.onchange = (e) => h('theme', e.target.value);
	if (elements.bgInput) elements.bgInput.oninput = (e) => { settings.theme = 'custom'; h('bg', e.target.value); };
	if (elements.accentInput) elements.accentInput.oninput = (e) => { settings.theme = 'custom'; h('accent', e.target.value); };
	if (elements.fgInput) elements.fgInput.oninput = (e) => { settings.theme = 'custom'; h('fg', e.target.value); };
	if (elements.fontSelect) elements.fontSelect.onchange = (e) => h('font', e.target.value);
	if (elements.customFontInput) elements.customFontInput.oninput = (e) => h('fontCustom', e.target.value);

	if (elements.scaleInput) elements.scaleInput.oninput = (e) => {
		const val = parseFloat(e.target.value);
		if (elements.valScale) elements.valScale.textContent = val.toFixed(1);
		h('scale', val);
	};
	if (elements.secScaleInput) elements.secScaleInput.oninput = (e) => {
		const val = parseFloat(e.target.value);
		if (elements.valSecScale) elements.valSecScale.textContent = val.toFixed(2);
		h('secScale', val);
	};
	if (elements.clockOpacityInput) elements.clockOpacityInput.oninput = (e) => {
		const val = parseFloat(e.target.value);
		if (elements.valClockOpacity) elements.valClockOpacity.textContent = val.toFixed(2);
		h('clockOpacity', val);
	};
	if (elements.foldersPerRowInput) elements.foldersPerRowInput.oninput = (e) => {
		const val = parseInt(e.target.value);
		if (elements.valFoldersPerRow) elements.valFoldersPerRow.textContent = val;
		h('foldersPerRow', val);
	};
	if (elements.sepMarginInput) elements.sepMarginInput.oninput = (e) => {
		const val = parseInt(e.target.value);
		if (elements.valSepMargin) elements.valSepMargin.textContent = val;
		h('sepMargin', val);
	};
	if (elements.secSepMarginInput) elements.secSepMarginInput.oninput = (e) => {
		const val = parseInt(e.target.value);
		if (elements.valSecSepMargin) elements.valSecSepMargin.textContent = val;
		h('secSepMargin', val);
	};
	if (elements.textAlignSelect) elements.textAlignSelect.onchange = (e) => h('textAlign', e.target.value);
	if (elements.settingsOpacityInput) elements.settingsOpacityInput.oninput = (e) => {
		const val = parseFloat(e.target.value);
		if (elements.valSettingsOpacity) elements.valSettingsOpacity.textContent = val.toFixed(2);
		h('settingsOpacity', val);
	};

	if (elements.clockFormatSelect) elements.clockFormatSelect.onchange = (e) => { settings.clockFormat = e.target.value; saveSettings(); updateClock(true); };

	if (elements.showSecToggle) elements.showSecToggle.onchange = (e) => h('showSeconds', e.target.checked);
	if (elements.iconsToggle) elements.iconsToggle.onchange = (e) => { settings.showIcons = e.target.checked; saveSettings(); loadBookmarks(); };

	if (elements.tabTitleInput) elements.tabTitleInput.oninput = (e) => h('tabTitle', e.target.value);

	if (elements.resetButton) {
		elements.resetButton.onclick = () => { if (confirm('Reset all settings to default?')) { settings = { ...DEFAULT_SETTINGS }; saveSettings(); loadBookmarks(); } };
	}

	if (elements.greeting) {
		elements.greeting.oninput = () => { settings.userNameFull = elements.greeting.innerText; saveSettings(); };
	}
}

document.addEventListener('DOMContentLoaded', init);
