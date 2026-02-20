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
	tabTitle: 'Mero Tab',
	sepMargin: 10,
	secSepMargin: 5,
	textAlign: 'right',
	settingsOpacity: 0.4,
	clockOpacity: 0.85,
	fontCustom: '',
	clockFormat: '24h',
	testMode: false
};

const THEMES = {
	dark: { bg: '#1f1f23', fg: '#ffffff', accent: '#ffffff' },
	light: { bg: '#ffffff', fg: '#000000', accent: '#000000' },
	everforest: { bg: '#2d353b', fg: '#d3c6aa', accent: '#a7c080' },
	gruvbox: { bg: '#282828', fg: '#ebdbb2', accent: '#fabd2f' },
	dracula: { bg: '#282a36', fg: '#f8f8f2', accent: '#bd93f9' },
	peach: { bg: '#FCF8F8', fg: '#433434', accent: '#F5AFAF' },
	sea: { bg: '#09637E', fg: '#EBF4F6', accent: '#7AB2B2' },
	black: { bg: '#000000', fg: '#ffffff', accent: '#ffffff' }
};

let settings = { ...DEFAULT_SETTINGS };
let currentDigits = { h1: '', h2: '', m1: '', m2: '', s1: '', s2: '' };
let draggedElement = null;
let draggedType = null;

const query = s => document.querySelector(s);
const $ = {
	body: document.body,
	greeting: query('#greeting'),
	date: query('#date-subtitle'),
	bookmarksRoot: query('#bookmarks-root'),
	settingsToggle: query('#settings-toggle'),
	settingsPanel: query('#settings-panel'),
	resetButton: query('#reset-settings'),
	themeSelect: query('#setting-theme'),
	bgInput: query('#setting-bg'),
	accentInput: query('#setting-accent'),
	fgInput: query('#setting-fg'),
	fontSelect: query('#setting-font'),
	scaleInput: query('#setting-scale'),
	secScaleInput: query('#setting-sec-scale'),
	clockOpacityInput: query('#setting-clock-opacity'),
	valClockOpacity: query('#val-clock-opacity'),
	foldersPerRowInput: query('#setting-folders-per-row'),
	showSecToggle: query('#setting-show-sec'),
	iconsToggle: query('#setting-icons'),
	valScale: query('#val-scale'),
	valSecScale: query('#val-sec-scale'),
	valFoldersPerRow: query('#val-folders-per-row'),
	sepMarginInput: query('#setting-sep-margin'),
	valSepMargin: query('#val-sep-margin'),
	secSepMarginInput: query('#setting-sec-sep-margin'),
	valSecSepMargin: query('#val-sec-sep-margin'),
	textAlignSelect: query('#setting-text-align'),
	settingsOpacityInput: query('#setting-settings-opacity'),
	valSettingsOpacity: query('#val-settings-opacity'),
	tabTitleInput: query('#setting-tab-title'),
	customFontContainer: query('#custom-font-container'),
	customFontInput: query('#setting-font-custom'),
	clockFormatSelect: query('#setting-clock-format'),
	testModeToggle: query('#setting-test-mode'),
	timeContainer: query('#time-large'),
	secondsContainer: query('#seconds-container'),
	digits: {
		h1: query('#hour-1'), h2: query('#hour-2'),
		m1: query('#min-1'), m2: query('#min-2'),
		s1: query('#sec-1'), s2: query('#sec-2')
	}
};

const debounce = (fn, wait) => {
	let timeout;
	return (...args) => {
		clearTimeout(timeout);
		timeout = setTimeout(() => fn(...args), wait);
	};
};

const saveSettings = (immediate = false) => {
	const save = () => {
		try {
			if (globalThis.chrome?.storage?.sync) {
				chrome.storage.sync.set(settings);
			} else {
				localStorage.setItem('mero_settings', JSON.stringify(settings));
			}
		} catch (e) {
			console.error('Mero Tab: Failed to save settings', e);
		}
	};
	immediate ? save() : debouncedSave();
	applySettings();
};

const debouncedSave = debounce(saveSettings, 300);

async function loadSettings() {
	try {
		if (globalThis.chrome?.storage?.sync) {
			return new Promise(resolve => {
				chrome.storage.sync.get(DEFAULT_SETTINGS, items => {
					settings = { ...DEFAULT_SETTINGS, ...items };
					resolve();
				});
			});
		}
		const saved = localStorage.getItem('mero_settings');
		if (saved) settings = { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
	} catch (e) {
		console.warn('Mero Tab: Could not load settings, using defaults', e);
	}
}

function applySettings() {
	const root = document.documentElement;
	if (!root) return;

	if (settings.theme !== 'custom') {
		const preset = THEMES[settings.theme];
		if (preset) Object.assign(settings, preset);
	}

	const cssVars = {
		'--bg': settings.bg,
		'--fg': settings.fg,
		'--accent': settings.accent,
		'--font-main': settings.font === 'custom' ? (settings.fontCustom || "'Inter', sans-serif") : settings.font,
		'--scale': settings.scale ?? 1.0,
		'--sec-scale': settings.secScale ?? 0.4,
		'--folders-per-row': settings.foldersPerRow ?? 3,
		'--sep-margin': (settings.sepMargin ?? 10) + 'px',
		'--sec-sep-margin': (settings.secSepMargin ?? 5) + 'px',
		'--text-align': ({ left: 'flex-start', center: 'center', right: 'flex-end' })[settings.textAlign] ?? 'flex-end',
		'--settings-trigger-opacity': settings.settingsOpacity ?? 0.4,
		'--clock-opacity': settings.clockOpacity ?? 0.85
	};
	Object.entries(cssVars).forEach(([prop, val]) => root.style.setProperty(prop, val));

	if ($.customFontContainer) $.customFontContainer.style.display = settings.font === 'custom' ? 'flex' : 'none';

	if ($.timeContainer) $.timeContainer.style.opacity = settings.clockOpacity ?? 0.85;
	if ($.secondsContainer) $.secondsContainer.style.display = settings.showSeconds ? 'flex' : 'none';

	const inputs = [
		[$.themeSelect, 'value', settings.theme],
		[$.bgInput, 'value', settings.bg],
		[$.accentInput, 'value', settings.accent],
		[$.fgInput, 'value', settings.fg],
		[$.fontSelect, 'value', settings.font],
		[$.scaleInput, 'value', settings.scale],
		[$.secScaleInput, 'value', settings.secScale],
		[$.clockOpacityInput, 'value', settings.clockOpacity],
		[$.foldersPerRowInput, 'value', settings.foldersPerRow],
		[$.showSecToggle, 'checked', settings.showSeconds],
		[$.iconsToggle, 'checked', settings.showIcons],
		[$.testModeToggle, 'checked', settings.testMode],
		[$.sepMarginInput, 'value', settings.sepMargin],
		[$.secSepMarginInput, 'value', settings.secSepMargin],
		[$.textAlignSelect, 'value', settings.textAlign],
		[$.settingsOpacityInput, 'value', settings.settingsOpacity],
		[$.customFontInput, 'value', settings.fontCustom || ''],
		[$.clockFormatSelect, 'value', settings.clockFormat],
		[$.tabTitleInput, 'value', settings.tabTitle || 'Mero Tab']
	];
	inputs.forEach(([el, prop, val]) => { if (el) el[prop] = val; });

	const displays = [
		[$.valScale, settings.scale ?? 1.0, 1],
		[$.valSecScale, settings.secScale ?? 0.4, 2],
		[$.valClockOpacity, settings.clockOpacity ?? 0.85, 2],
		[$.valFoldersPerRow, settings.foldersPerRow ?? 3],
		[$.valSepMargin, settings.sepMargin ?? 10],
		[$.valSecSepMargin, settings.secSepMargin ?? 5],
		[$.valSettingsOpacity, settings.settingsOpacity ?? 0.4, 2]
	];
	displays.forEach(([el, val, decimals]) => {
		if (el) el.textContent = decimals !== undefined ? val.toFixed(decimals) : val;
	});

	document.title = settings.tabTitle || 'Mero Tab';

	updateGreeting();
}

function updateClock(immediate = false) {
	const now = new Date();
	let hours, minutes, seconds;

	if (settings.testMode) {
		hours = minutes = seconds = 0;
	} else {
		hours = now.getHours();
		if (settings.clockFormat === '12h') hours = hours % 12 || 12;
		minutes = now.getMinutes();
		seconds = now.getSeconds();
	}

	const pad = n => String(n).padStart(2, '0');
	const [h1, h2] = pad(hours);
	const [m1, m2] = pad(minutes);
	const [s1, s2] = pad(seconds);

	const newDigits = { h1, h2, m1, m2, s1, s2 };

	Object.keys(newDigits).forEach(key => {
		if (newDigits[key] !== currentDigits[key]) {
			flipDigit($.digits[key], newDigits[key], immediate);
			currentDigits[key] = newDigits[key];
		}
	});

	if ($.date) {
		$.date.textContent = now.toLocaleDateString('en-US', {
			weekday: 'long', month: 'long', day: 'numeric'
		});
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

function updateGreeting() {
	if (!$.greeting) return;
	const hour = new Date().getHours();
	const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
	$.greeting.textContent = greeting;
}

const WORD_BANK = ['Nebula', 'Zenith', 'Vortex', 'Pulse', 'Echo', 'Lumina', 'Stellar', 'Aventis', 'Cyber', 'Flux', 'Nova', 'Titan', 'Apex', 'Ethereal', 'Prism', 'Oracle', 'Synergy', 'Catalyst', 'Nexus', 'Aura'];

const randomWord = () => WORD_BANK[Math.random() * WORD_BANK.length | 0];

function generateTestBookmarks() {
	return {
		children: Array.from({ length: 6 }, (_, i) => ({
			id: `test-folder-${i}`,
			title: randomWord(),
			children: Array.from({ length: 4 + (Math.random() * 5 | 0) }, (_, j) => ({
				id: `test-bm-${i}-${j}`,
				title: randomWord(),
				url: 'https://example.com'
			}))
		}))
	};
}

function loadBookmarks() {
	if (settings.testMode) return renderBookmarks(generateTestBookmarks());
	if (!globalThis.chrome?.bookmarks) return renderDummyBookmarks();

	try {
		chrome.bookmarks.getTree(([root]) => {
			const rootNode = root.children?.find(c => c.id === '1') || root.children?.[0];
			if (rootNode) renderBookmarks(rootNode);
		});
	} catch {
		renderDummyBookmarks();
	}
}

function renderBookmarks(rootNode) {
	if (!$.bookmarksRoot) return;
	$.bookmarksRoot.innerHTML = '';

	const grid = document.createElement('div');
	grid.className = 'bookmarks-grid';

	const folderMap = new Map();
	let topItems = [];

	rootNode.children?.forEach(child => {
		(child.children ? folderMap : topItems).set?.(
			child.title?.toLowerCase().trim(), child
		) || topItems.push(child);
	});
	if (topItems.length) folderMap.set('bookmarks', { title: 'Bookmarks', children: topItems, id: 'virtual-root' });

	const customOrder = (settings.folderOrder || '').split('\n').map(s => s.trim().toLowerCase()).filter(Boolean);
	const ordered = [];
	customOrder.forEach(title => {
		if (folderMap.has(title)) ordered.push(folderMap.get(title));
		folderMap.delete(title);
	});
	folderMap.forEach(v => ordered.push(v));

	ordered.forEach(folder => {
		const group = document.createElement('div');
		group.className = 'folder-group';
		group.draggable = true;
		group.dataset.title = folder.title;
		group.dataset.id = folder.id;

		const title = document.createElement('div');
		title.className = 'folder-title';
		title.textContent = settings.testMode ? randomWord() : folder.title;
		group.appendChild(title);

		folder.children?.forEach(bm => {
			if (!bm.url) return;
			const link = document.createElement('a');
			link.className = 'bookmark-item';
			link.href = bm.url;
			link.draggable = true;
			link.dataset.id = bm.id;

			if (settings.showIcons) {
				const icon = document.createElement('img');
				if (settings.testMode) {
					icon.src = '/icons/internet.png';
				} else try {
					icon.src = `chrome-extension://${chrome.runtime.id}/_favicon/?pageUrl=${encodeURIComponent(bm.url)}&size=16`;
				} catch { }
				link.appendChild(icon);
			}

			const text = document.createElement('span');
			text.textContent = settings.testMode ? randomWord() : (bm.title || bm.url);
			link.appendChild(text);
			group.appendChild(link);
		});

		setupDragEvents(group, 'folder');
		group.querySelectorAll('.bookmark-item').forEach(item => setupDragEvents(item, 'bookmark'));
		grid.appendChild(group);
	});

	$.bookmarksRoot.appendChild(grid);
}

function renderDummyBookmarks() {
	if ($.bookmarksRoot) {
		$.bookmarksRoot.innerHTML = '<div class="bookmarks-grid"><div class="folder-group"><div class="folder-title">Sample</div><a class="bookmark-item" href="https://google.com">Google</a></div></div>';
	}
}

function setupDragEvents(el, type) {
	if (!el) return;
	el.addEventListener('dragstart', e => {
		draggedElement = el;
		draggedType = type;
		el.classList.add('dragging');
		e.dataTransfer.setDragImage(new Image(0, 0), 0, 0);
		e.stopPropagation();
	});
	el.addEventListener('dragend', () => {
		el.classList.remove('dragging');
		document.querySelectorAll('.drag-over').forEach(d => d.classList.remove('drag-over'));
		draggedElement = null;
	});
	el.addEventListener('dragover', e => {
		if (draggedType !== type) return;
		e.preventDefault();
		el.classList.add('drag-over');
	});
	el.addEventListener('dragleave', () => el.classList.remove('drag-over'));
	el.addEventListener('drop', e => {
		e.preventDefault();
		el.classList.remove('drag-over');
		if (draggedType !== type || draggedElement === el) return;
		type === 'folder' ? reorderFolders(draggedElement, el) : reorderBookmarks(draggedElement, el);
	});
}

function reorderFolders(dragged, target) {
	const grid = dragged.parentNode;
	if (!grid) return;
	const folders = [...grid.children];
	if (folders.indexOf(dragged) < folders.indexOf(target)) {
		target.after(dragged);
	} else {
		target.before(dragged);
	}
	settings.folderOrder = [...grid.children].map(f => f.dataset.title).join('\n');
	saveSettings(true);
}

function reorderBookmarks(dragged, target) {
	(dragged.nextSibling === target) ? target.after(dragged) : target.before(dragged);
	if (!globalThis.chrome?.bookmarks) return;
	try {
		chrome.bookmarks.get(target.dataset.id, ([node]) => {
			if (node) chrome.bookmarks.move(dragged.dataset.id, { parentId: node.parentId, index: node.index }, loadBookmarks);
		});
	} catch { }
}

function setupEventListeners() {
	const set = (key, val, immediate = false) => { settings[key] = val; saveSettings(immediate); };

	$.settingsToggle?.addEventListener('click', e => {
		e.stopPropagation();
		$.settingsPanel?.classList.toggle('open');
	});

	document.addEventListener('click', e => {
		if ($.settingsPanel?.classList.contains('open') &&
			!$.settingsPanel.contains(e.target) && e.target !== $.settingsToggle) {
			$.settingsPanel.classList.remove('open');
		}
	});

	$.themeSelect?.addEventListener('change', e => set('theme', e.target.value, true));

	[$.bgInput, $.accentInput, $.fgInput].forEach(input => {
		input?.addEventListener('input', e => {
			set('theme', 'custom');
			set(input.id.replace('setting-', ''), e.target.value);
		});
	});

	$.fontSelect?.addEventListener('change', e => set('font', e.target.value, true));
	$.customFontInput?.addEventListener('input', e => set('fontCustom', e.target.value));

	const rangeInputs = [
		{ el: $.scaleInput, key: 'scale', display: $.valScale, decimals: 1 },
		{ el: $.secScaleInput, key: 'secScale', display: $.valSecScale, decimals: 2 },
		{ el: $.clockOpacityInput, key: 'clockOpacity', display: $.valClockOpacity, decimals: 2 },
		{ el: $.foldersPerRowInput, key: 'foldersPerRow', display: $.valFoldersPerRow },
		{ el: $.sepMarginInput, key: 'sepMargin', display: $.valSepMargin },
		{ el: $.secSepMarginInput, key: 'secSepMargin', display: $.valSecSepMargin },
		{ el: $.settingsOpacityInput, key: 'settingsOpacity', display: $.valSettingsOpacity, decimals: 2 }
	];
	rangeInputs.forEach(({ el, key, display, decimals }) => {
		el?.addEventListener('input', e => {
			const val = e.target.value.includes('.') ? parseFloat(e.target.value) : parseInt(e.target.value, 10);
			if (display) display.textContent = decimals !== undefined ? val.toFixed(decimals) : val;
			set(key, val);
		});
	});

	$.textAlignSelect?.addEventListener('change', e => set('textAlign', e.target.value, true));

	$.clockFormatSelect?.addEventListener('change', e => {
		settings.clockFormat = e.target.value;
		saveSettings(true);
		updateClock(true);
	});

	$.showSecToggle?.addEventListener('change', e => set('showSeconds', e.target.checked, true));
	$.iconsToggle?.addEventListener('change', e => {
		settings.showIcons = e.target.checked;
		saveSettings(true);
		loadBookmarks();
	});
	$.testModeToggle?.addEventListener('change', e => {
		settings.testMode = e.target.checked;
		saveSettings(true);
		updateClock(true);
		loadBookmarks();
	});

	$.tabTitleInput?.addEventListener('keydown', e => {
		if (e.key === 'Enter') {
			set('tabTitle', e.target.value, true);
			e.target.blur();
		}
	});

	$.resetButton?.addEventListener('click', () => {
		if (confirm('Reset all settings to default?')) {
			settings = { ...DEFAULT_SETTINGS };
			saveSettings(true);
			loadBookmarks();
		}
	});
}

async function init() {
	await loadSettings();
	applySettings();
	updateClock(true);
	setInterval(updateClock, 1000);
	loadBookmarks();
	setupEventListeners();
}

document.addEventListener('DOMContentLoaded', init);

if (globalThis.chrome?.storage) {
	chrome.storage.onChanged.addListener((changes, area) => {
		if (area === 'sync') loadSettings().then(applySettings);
	});
}
