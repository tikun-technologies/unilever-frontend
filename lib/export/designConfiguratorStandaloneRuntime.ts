export function getDesignConfiguratorStandaloneRuntime(): string {
  return String.raw`
(function () {
  try {
  const METRICS = ["Top Down", "Bottom Up", "Response Time"];
  const METRIC_KEYS = { "Top Down": "(T) Overall", "Bottom Up": "(B) Overall", "Response Time": "(R) Overall" };
  const METRIC_PREFIX = { "Top Down": "(T)", "Bottom Up": "(B)", "Response Time": "(R)" };
  const AGE_SEGMENTS = ["13-17", "18-24", "25-34", "35-44", "45-54", "55-64", "65+"];
  const MAX_NON_LAYER = 4;

  const payload = JSON.parse(document.getElementById("export-data").textContent || "{}");
  const studyId = payload.studyId;
  const studyType = (payload.studyType || "grid").toLowerCase();
  const isLayerStudy = studyType === "layer";
  const storageKey = "designConfiguratorSavedDesigns:" + studyId;

  const state = {
    analysisData: payload.analysisData || {},
    designConstraints: payload.designConstraints || [],
    studyLayers: payload.studyLayers || [],
    activeMetric: "Top Down",
    activeSegmentId: "",
    selectedByCategory: {},
    isInputDesignMode: false,
    showInputInsights: false,
    activeInputInsightMetric: "Top Down",
    showLayerBackground: false,
    isSelectionOpen: false,
    openCategoryNames: {},
    savedDesigns: { configurator: [], input: [] },
    savedDesignType: "configurator",
    isComparePanelOpen: false,
    selectedCompareIds: [],
    compareDesigns: [],
    compareError: null,
    isSaveModalOpen: false,
    saveName: "",
    saveError: null,
    lightboxImage: null,
    previewFullscreen: false,
  };

  function toNumber(v, f) { const n = Number(v); return Number.isFinite(n) ? n : (f || 0); }
  function normalizeText(v) { return typeof v === "string" ? v.trim() : ""; }
  function isHttpUrl(v) { return typeof v === "string" && /^https?:\/\//i.test(v); }
  function esc(s) { return String(s ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }
  function formatValue(value, metric) {
    if (!Number.isFinite(value)) return "0";
    if (metric === "Response Time") return Math.abs(value) < 1 ? value.toFixed(3) : value.toFixed(1);
    return Number.isInteger(value) ? String(value) : value.toFixed(1);
  }
  function getElementKey(category, elementName) { return category + "::" + elementName; }
  function getLayerId(category) { return normalizeText(category.layer_id || category.layerId || category.id || category.category_id || category.categoryId) || undefined; }
  function getImageId(element) { return normalizeText(element.image_id || element.imageId || element.id || element.element_id || element.elementId) || undefined; }
  function getSegmentId(sectionKey, valueKey) { return valueKey ? sectionKey + "::" + valueKey : sectionKey; }
  function formatSegmentLabel(valueKey) {
    const m = valueKey.match(/^Mindset_(\d+)_of_\d+$/);
    return m ? "Mindset " + m[1] : valueKey.replace(/_/g, " ");
  }
  function addSegmentOption(options, option) {
    const id = getSegmentId(option.sectionKey, option.valueKey);
    if (options.some((e) => e.id === id || e.label === option.label)) return;
    options.push(Object.assign({ id }, option));
  }
  function getAvailableSegmentOptions(analysisData, metric) {
    const prefix = METRIC_PREFIX[metric];
    const options = [];
    addSegmentOption(options, { label: "Overall", sectionKey: prefix + " Overall" });
    const genderSection = analysisData[prefix + " Gender"];
    Object.keys((genderSection && genderSection.segments) || {}).forEach((key) => {
      addSegmentOption(options, { label: key, sectionKey: prefix + " Gender", valueKey: key });
    });
    const ageSection = analysisData[prefix + " Age"];
    const ageKeys = Array.from(new Set([...AGE_SEGMENTS, ...Object.keys((ageSection && ageSection.segments) || {})]));
    if (ageSection) ageKeys.forEach((key) => addSegmentOption(options, { label: key, sectionKey: prefix + " Age", valueKey: key }));
    const mindsetSection = analysisData[prefix + " Mindsets"];
    const mindsetGroup = (mindsetSection && mindsetSection.groups && (mindsetSection.groups.Mindset_3 || mindsetSection.groups.Mindset_2)) || {};
    Object.keys(mindsetGroup).sort().forEach((key) => addSegmentOption(options, { label: formatSegmentLabel(key), sectionKey: prefix + " Mindsets", valueKey: key }));
    return options;
  }
  function getInfoCategories(analysisData) {
    const info = analysisData["Information Block"] || {};
    const candidates = [info.Categories, info.categories, info.Layers, info.layers, info["Study Layers"], info.study_layers, analysisData.study_layers];
    const match = candidates.find((c) => Array.isArray(c) && c.length > 0);
    return Array.isArray(match) ? match : [];
  }
  function getRawElements(category) {
    const candidates = [category.elements, category.Elements, category.images, category.Images, category.options];
    const match = candidates.find((c) => Array.isArray(c) && c.length > 0);
    return Array.isArray(match) ? match : [];
  }
  function pickElementImage(element) {
    const candidates = [element.content, element.url, element.imageUrl, element.imageLink, element.image, element.secureUrl, element.previewUrl];
    return candidates.find(isHttpUrl) || null;
  }
  function pickTransform(element) {
    const transform = element.transform || element.position || (element.metadata && element.metadata.transform);
    if (!transform || typeof transform !== "object") return undefined;
    return { x: toNumber(transform.x, 0), y: toNumber(transform.y, 0), width: toNumber(transform.width, 100), height: toNumber(transform.height, 100) };
  }
  function getScoreMap(analysisData, metric, segment) {
    const section = analysisData[segment.sectionKey || METRIC_KEYS[metric]];
    const scoreMap = new Map();
    (section && section.categories || []).forEach((category) => {
      const categoryName = normalizeText(category.name);
      (category.elements || []).forEach((element) => {
        const name = normalizeText(element.name);
        if (!categoryName || !name) return;
        scoreMap.set(getElementKey(categoryName, name), {
          value: segment.valueKey ? toNumber(element.values && element.values[segment.valueKey], 0) : toNumber(element.value, 0),
        });
      });
    });
    return scoreMap;
  }
  function getCategoryIdentity(category, categoryName, categoryIndex) {
    const explicitId = normalizeText(category.category_id || category.categoryId || category.id || category.layer_id || category.layerId || category.code);
    const phaseType = normalizeText(category.phase_type || category.phaseType || category.study_type || category.studyType || category.type || category.mode);
    const prefix = [phaseType, explicitId].filter(Boolean).join("::");
    return [prefix || "idx-" + categoryIndex, categoryName].join("::");
  }
  function getCategoriesForMetric(analysisData, metric, segment) {
    const infoCategories = getInfoCategories(analysisData);
    const scoreMap = getScoreMap(analysisData, metric, segment);
    if (!infoCategories.length) {
      const section = analysisData[segment.sectionKey || METRIC_KEYS[metric]];
      return (section && section.categories || []).map((category, categoryIndex) => {
        const categoryName = normalizeText(category.name) || "Category " + (categoryIndex + 1);
        const categoryKey = getCategoryIdentity(category, categoryName, categoryIndex);
        const layerId = getLayerId(category);
        const zIndex = toNumber(category.z_index ?? category.z, categoryIndex + 1);
        const elements = getRawElements(category).map((element, elementIndex) => {
          const name = normalizeText(element.name) || "Element " + (elementIndex + 1);
          return {
            id: getElementKey(categoryKey, name), name, category: categoryName, categoryKey,
            layerId, imageId: getImageId(element),
            value: segment.valueKey ? toNumber(element.values && element.values[segment.valueKey], 0) : toNumber(element.value, 0),
            imageUrl: pickElementImage(element), content: normalizeText(element.content) || null,
            elementType: normalizeText(element.element_type || element.elementType), zIndex, transform: pickTransform(element),
          };
        });
        return { key: categoryKey, name: categoryName, zIndex, elements };
      }).filter((c) => c.elements.length > 0);
    }
    return infoCategories.map((category, categoryIndex) => {
      const categoryName = normalizeText(category.name || category.title) || "Category " + (categoryIndex + 1);
      const categoryKey = getCategoryIdentity(category, categoryName, categoryIndex);
      const layerId = getLayerId(category);
      const zIndex = toNumber(category.z_index ?? category.z, categoryIndex + 1);
      const elements = getRawElements(category).map((element, elementIndex) => {
        const name = normalizeText(element.name || element.alt_text) || "Element " + (elementIndex + 1);
        const score = scoreMap.get(getElementKey(categoryName, name));
        const elementType = normalizeText(element.element_type || element.elementType);
        const imageUrl = elementType.toLowerCase() === "text" ? null : pickElementImage(element);
        return {
          id: getElementKey(categoryKey, name), name, category: categoryName, categoryKey,
          layerId, imageId: getImageId(element),
          value: (score && score.value) || 0, imageUrl, content: normalizeText(element.content) || null,
          elementType, zIndex: toNumber(element.z_index ?? element.z ?? category.z_index ?? category.z ?? zIndex, zIndex), transform: pickTransform(element),
        };
      });
      return { key: categoryKey, name: categoryName, zIndex, elements };
    }).filter((c) => c.elements.length > 0);
  }
  function getBackgroundUrl(analysisData) {
    const info = analysisData["Information Block"] || {};
    const candidates = [info["Study Background"], info.background_image_url, info.Background, info.metadata && info.metadata.background_image_url, analysisData.background_image_url, analysisData.metadata && analysisData.metadata.background_image_url];
    return candidates.find(isHttpUrl) || null;
  }
  function getLayerAspectRatio(analysisData) {
    const info = analysisData["Information Block"] || {};
    const frontPage = analysisData["Front Page"] || {};
    const raw = normalizeText(info["Aspect Ratio"] || info.aspect_ratio || frontPage["Aspect Ratio"] || frontPage.aspect_ratio).toLowerCase();
    if (raw === "landscape" || raw === "16:9") return "16 / 9";
    if (raw === "square" || raw === "1:1") return "1 / 1";
    if (raw === "portrait" || raw === "9:16") return "9 / 16";
    const match = raw.match(/^(\d+(?:\.\d+)?)\s*[:/]\s*(\d+(?:\.\d+)?)$/);
    if (match) return match[1] + " / " + match[2];
    return "9 / 16";
  }
  function buildInputDesignInsights(analysisData, selectedByCategory) {
    const result = {};
    METRICS.forEach((metric) => {
      const segments = getAvailableSegmentOptions(analysisData, metric);
      result[metric] = segments.map((segment) => {
        const categories = getCategoriesForMetric(analysisData, metric, segment);
        const value = categories.reduce((sum, category) => {
          const selectedId = selectedByCategory[category.key];
          const element = category.elements.find((e) => e.id === selectedId);
          return sum + ((element && element.value) || 0);
        }, 0);
        return { segment_id: segment.id, label: segment.label, value };
      });
    });
    return result;
  }
  function buildDefaultSelection(categories) {
    const selected = {};
    const ranked = categories.map((category) => ({ category, best: [...category.elements].sort((a, b) => b.value - a.value)[0] })).filter((i) => i.best)
      .sort((a, b) => isLayerStudy ? a.category.zIndex - b.category.zIndex : b.best.value - a.best.value);
    ranked.slice(0, isLayerStudy ? ranked.length : MAX_NON_LAYER).forEach(({ category, best }) => { selected[category.key] = best.id; });
    return selected;
  }
  function constraintRefKey(ref) {
    const layerId = normalizeText(ref.layer_id || ref.layerId);
    const imageId = normalizeText(ref.image_id || ref.imageId);
    return layerId && imageId ? layerId + "::" + imageId : null;
  }
  function elementConstraintKey(element) {
    return element.layerId && element.imageId ? element.layerId + "::" + element.imageId : null;
  }
  function buildConflictPairSet(designConstraints) {
    const pairs = new Set();
    (designConstraints || []).forEach(function(constraint) {
      const anchors = Array.isArray(constraint.anchors) ? constraint.anchors : [];
      const blocked = Array.isArray(constraint.blocked) ? constraint.blocked : [];
      anchors.forEach(function(anchor) {
        const anchorKey = constraintRefKey(anchor);
        if (!anchorKey) return;
        blocked.forEach(function(blockedRef) {
          const blockedKey = constraintRefKey(blockedRef);
          if (!blockedKey || blockedKey === anchorKey) return;
          pairs.add(anchorKey + "|" + blockedKey);
          pairs.add(blockedKey + "|" + anchorKey);
        });
      });
    });
    return pairs;
  }
  function conflictsWithSelected(element, selectedElements, conflictPairs) {
    const elementKey = elementConstraintKey(element);
    if (!elementKey) return false;
    return selectedElements.some(function(selected) {
      const selectedKey = elementConstraintKey(selected);
      return Boolean(selectedKey && conflictPairs.has(elementKey + "|" + selectedKey));
    });
  }
  function buildConstraintAwareLayerBestMix(categories, designConstraints) {
    const conflictPairs = buildConflictPairSet(designConstraints);
    if (!conflictPairs.size) return buildDefaultSelection(categories);
    function conflictDegree(category) {
      return category.elements.reduce(function(count, element) {
        const key = elementConstraintKey(element);
        if (!key) return count;
        conflictPairs.forEach(function(pair) {
          if (pair.indexOf(key + "|") === 0) count += 1;
        });
        return count;
      }, 0);
    }
    const layerCategories = categories.filter((category) => category.elements.length > 0)
      .sort((a, b) => {
        const degreeDelta = conflictDegree(b) - conflictDegree(a);
        if (degreeDelta !== 0) return degreeDelta;
        const sizeDelta = a.elements.length - b.elements.length;
        if (sizeDelta !== 0) return sizeDelta;
        return a.zIndex - b.zIndex;
      })
      .map((category) => ({ category, elements: [...category.elements].sort((a, b) => b.value - a.value) }));
    if (!layerCategories.length) return {};
    const suffixBest = new Array(layerCategories.length + 1).fill(0);
    for (let idx = layerCategories.length - 1; idx >= 0; idx -= 1) {
      suffixBest[idx] = suffixBest[idx + 1] + Math.max(0, (layerCategories[idx].elements[0] && layerCategories[idx].elements[0].value) || 0);
    }
    let bestScore = 0;
    let bestSelection = {};
    function search(index, selectedElements, selectedByCategory, score) {
      if (score + suffixBest[index] <= bestScore) return;
      if (index === layerCategories.length) {
        bestScore = score;
        bestSelection = Object.assign({}, selectedByCategory);
        return;
      }
      const item = layerCategories[index];
      search(index + 1, selectedElements, selectedByCategory, score);
      item.elements.forEach(function(element) {
        if (conflictsWithSelected(element, selectedElements, conflictPairs)) return;
        selectedByCategory[item.category.key] = element.id;
        selectedElements.push(element);
        search(index + 1, selectedElements, selectedByCategory, score + element.value);
        selectedElements.pop();
        delete selectedByCategory[item.category.key];
      });
    }
    search(0, [], {}, 0);
    return bestSelection;
  }
  function normalizeLookupKey(value) {
    return normalizeText(value).toLowerCase();
  }
  function enrichLayerCategoriesWithIds(categories, studyLayers) {
    if (!Array.isArray(studyLayers) || !studyLayers.length) return categories;
    const layerByName = new Map();
    studyLayers.forEach(function(layer) {
      const nameKey = normalizeLookupKey((layer && layer.name) || (layer && layer.title));
      if (nameKey && !layerByName.has(nameKey)) layerByName.set(nameKey, layer);
    });
    return categories.map(function(category) {
      const matchedLayer = layerByName.get(normalizeLookupKey(category.name));
      if (!matchedLayer) return category;
      const layerId = normalizeText(matchedLayer.layer_id || matchedLayer.layerId || matchedLayer.id) || undefined;
      const imageByName = new Map();
      (Array.isArray(matchedLayer.images) ? matchedLayer.images : []).forEach(function(image) {
        const nameKey = normalizeLookupKey((image && image.name) || (image && image.alt_text));
        if (nameKey && !imageByName.has(nameKey)) imageByName.set(nameKey, image);
      });
      return Object.assign({}, category, {
        elements: category.elements.map(function(element) {
          if (element.layerId && element.imageId) return element;
          const matchedImage = imageByName.get(normalizeLookupKey(element.name));
          if (!matchedImage) return Object.assign({}, element, { layerId: element.layerId || layerId });
          return Object.assign({}, element, {
            layerId: element.layerId || layerId,
            imageId: element.imageId || normalizeText(matchedImage.image_id || matchedImage.imageId || matchedImage.id) || undefined,
          });
        }),
      });
    });
  }
  function getSegmentOptions() { return getAvailableSegmentOptions(state.analysisData, state.activeMetric); }
  function getActiveSegment() { const opts = getSegmentOptions(); return opts.find((s) => s.id === state.activeSegmentId) || opts[0]; }
  function getCategories() { const seg = getActiveSegment(); const categories = seg ? getCategoriesForMetric(state.analysisData, state.activeMetric, seg) : []; return isLayerStudy ? enrichLayerCategoriesWithIds(categories, state.studyLayers) : categories; }
  function getSelectedElements() {
    return getCategories().map((category) => category.elements.find((e) => e.id === state.selectedByCategory[category.key])).filter(Boolean);
  }
  function getCurrentSavedDesigns() { return state.savedDesigns[state.savedDesignType] || []; }
  function uuid() { return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => { const r = Math.random() * 16 | 0; const v = c === "x" ? r : (r & 0x3 | 0x8); return v.toString(16); }); }

  const elementMediaLookup = (function buildElementMediaLookup(analysisData) {
    const lookup = {};
    const remember = function(category, categoryIndex) {
      const categoryName = normalizeText((category && category.name) || (category && category.title)) || ("Category " + (categoryIndex + 1));
      const categoryKey = getCategoryIdentity(category, categoryName, categoryIndex);
      const zIndex = toNumber((category && category.z_index) ?? (category && category.z), categoryIndex + 1);
      getRawElements(category).forEach(function(element, elementIndex) {
        const name = normalizeText((element && element.name) || (element && element.alt_text)) || ("Element " + (elementIndex + 1));
        const elementType = normalizeText((element && element.element_type) || (element && element.elementType));
        const id = getElementKey(categoryKey, name);
        lookup[id] = {
          imageUrl: elementType.toLowerCase() === "text" ? null : pickElementImage(element),
          content: normalizeText(element && element.content) || null,
          elementType: elementType,
          zIndex: toNumber((element && element.z_index) ?? (element && element.z) ?? zIndex, zIndex),
          transform: pickTransform(element),
        };
      });
    };
    getInfoCategories(analysisData).forEach(remember);
    METRICS.forEach(function(metric) {
      const section = analysisData[METRIC_KEYS[metric]];
      (section && section.categories || []).forEach(remember);
    });
    return lookup;
  })(payload.analysisData || {});

  function slimSelectedElement(element) {
    return {
      id: element.id,
      name: element.name,
      category: element.category,
      category_key: element.category_key || element.categoryKey,
      layer_id: element.layer_id || element.layerId,
      image_id: element.image_id || element.imageId,
      value: element.value,
      content: element.content || null,
      element_type: element.element_type || element.elementType,
      z_index: element.z_index ?? element.zIndex,
      transform: element.transform,
    };
  }

  function slimConfiguration(configuration) {
    if (!configuration) return {};
    return {
      metric: configuration.metric,
      study_type: configuration.study_type,
      design_type: configuration.design_type,
      segment: configuration.segment,
      selected_by_category: configuration.selected_by_category || {},
      selected_elements: (configuration.selected_elements || []).map(slimSelectedElement),
      input_insights: configuration.input_insights,
      show_layer_background: configuration.show_layer_background,
      aspect_ratio: configuration.aspect_ratio,
      total_coefficient: configuration.total_coefficient,
    };
  }

  function slimSavedDesign(design) {
    return {
      id: design.id,
      study_id: design.study_id,
      name: design.name,
      design_type: design.design_type,
      study_type: design.study_type,
      metric: design.metric,
      segment_label: design.segment_label,
      selection_count: design.selection_count,
      total_coefficient: design.total_coefficient,
      configuration: slimConfiguration(design.configuration),
      created_at: design.created_at,
      updated_at: design.updated_at,
    };
  }

  function slimSavedDesigns(savedDesigns) {
    return {
      configurator: (savedDesigns.configurator || []).map(slimSavedDesign),
      input: (savedDesigns.input || []).map(slimSavedDesign),
    };
  }

  function hydrateConfiguration(configuration) {
    if (!configuration) return {};
    const backgroundUrl = configuration.show_layer_background ? getBackgroundUrl(state.analysisData) : null;
    return Object.assign({}, configuration, {
      background_url: backgroundUrl,
      selected_elements: (configuration.selected_elements || []).map(function(element, index) {
        const id = element.id || ("saved-" + index);
        const media = elementMediaLookup[id] || {};
        return {
          id: id,
          name: element.name || "Element",
          category: element.category || "",
          category_key: element.category_key || element.categoryKey || "",
          layer_id: element.layer_id || element.layerId,
          image_id: element.image_id || element.imageId,
          value: toNumber(element.value, 0),
          image_url: media.imageUrl || null,
          content: element.content || media.content || null,
          element_type: element.element_type || element.elementType || media.elementType,
          z_index: toNumber(element.z_index ?? element.zIndex ?? media.zIndex, index + 1),
          transform: element.transform || media.transform,
        };
      }),
    });
  }

  function hydrateSavedDesign(design) {
    return Object.assign({}, design, { configuration: hydrateConfiguration(design.configuration) });
  }

  function hydrateSavedDesigns(savedDesigns) {
    return {
      configurator: (savedDesigns.configurator || []).map(hydrateSavedDesign),
      input: (savedDesigns.input || []).map(hydrateSavedDesign),
    };
  }

  function loadSavedDesignsFromStorage() {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) return JSON.parse(raw);
    } catch {}
    return null;
  }

  function persistSavedDesigns() {
    try {
      localStorage.setItem(storageKey, JSON.stringify(slimSavedDesigns(state.savedDesigns)));
    } catch (error) {
      console.warn("Could not persist saved designs to localStorage", error);
    }
  }

  function seedSavedDesigns() {
    const stored = loadSavedDesignsFromStorage();
    if (stored && stored.configurator && stored.input) {
      state.savedDesigns = hydrateSavedDesigns(stored);
      return;
    }
    state.savedDesigns = hydrateSavedDesigns(JSON.parse(JSON.stringify(payload.savedDesigns || { configurator: [], input: [] })));
    try {
      localStorage.setItem(storageKey, JSON.stringify(slimSavedDesigns(state.savedDesigns)));
    } catch (error) {
      try { localStorage.removeItem(storageKey); } catch {}
      persistSavedDesigns();
    }
  }
  function renderPreviewHtml(elements, options) {
    const bg = options.backgroundUrl;
    const aspect = options.aspectRatio || "9 / 16";
    if (!elements.length && !(isLayerStudy && bg)) {
      return '<div class="preview-empty" style="aspect-ratio:' + esc(aspect) + '"><p>Select elements to build your preview</p></div>';
    }
    if (isLayerStudy) {
      const sorted = [...elements].sort((a, b) => a.zIndex - b.zIndex);
      const layers = sorted.map((element) => {
        const t = element.transform || { x: 0, y: 0, width: 100, height: 100 };
        const style = 'top:' + t.y + '%;left:' + t.x + '%;width:' + t.width + '%;height:' + t.height + '%;z-index:' + (element.zIndex + 1);
        if (!element.imageUrl) return '<div class="layer-text" style="' + style + '">' + esc(element.name) + '</div>';
        return '<img class="layer-image" style="' + style + '" src="' + esc(element.imageUrl) + '" alt="' + esc(element.name) + '">';
      }).join("");
      const bgHtml = bg && options.showBackground ? '<img class="preview-bg" src="' + esc(bg) + '" alt="Background">' : "";
      return '<div class="layer-preview" style="aspect-ratio:' + esc(aspect) + '">' + bgHtml + '<div class="layer-stack">' + layers + '</div></div>';
    }
    const count = elements.length;
    const gridClass = count === 1 ? "grid-1" : count === 2 ? "grid-2" : "grid-2";
    const cells = elements.map((element, index) => {
      const span = count === 3 && index === 2 ? " span-2" : "";
      const isText = !element.imageUrl || (element.elementType || "").toLowerCase() === "text";
      const inner = isText ? '<div class="text-cell">' + esc(element.content || element.name) + '</div>' : '<img src="' + esc(element.imageUrl) + '" alt="' + esc(element.name) + '">';
      return '<div class="grid-cell' + span + '">' + inner + '</div>';
    }).join("");
    const bgHtml = bg ? '<img class="preview-bg-fade" src="' + esc(bg) + '" alt="">' : "";
    return '<div class="grid-preview ' + gridClass + '">' + bgHtml + cells + '</div>';
  }
  function getSavedDesignElements(design) {
    return (design.configuration && design.configuration.selected_elements || []).map((element, index) => ({
      id: element.id || "saved-" + index,
      name: element.name || "Element",
      category: element.category || "",
      categoryKey: element.category_key || element.categoryKey || "",
      value: toNumber(element.value, 0),
      imageUrl: element.image_url || element.imageUrl || null,
      content: element.content || null,
      elementType: element.element_type || element.elementType,
      zIndex: toNumber(element.z_index ?? element.zIndex, index + 1),
      transform: element.transform,
    }));
  }
  function render() {
    const app = document.getElementById("configurator-app");
    if (!app) return;
    const categories = getCategories();
    const segmentOptions = getSegmentOptions();
    const activeSegment = getActiveSegment();
    if (!state.activeSegmentId && segmentOptions[0]) state.activeSegmentId = segmentOptions[0].id;
    const selectedElements = getSelectedElements();
    const totalCoefficient = selectedElements.reduce((sum, e) => sum + e.value, 0);
    const backgroundUrl = getBackgroundUrl(state.analysisData);
    const aspectRatio = getLayerAspectRatio(state.analysisData);
    const hasPreview = selectedElements.length > 0 || (isLayerStudy && state.showLayerBackground && backgroundUrl);
    const inputInsights = buildInputDesignInsights(state.analysisData, state.selectedByCategory);
    const currentSaved = getCurrentSavedDesigns();
    const defaultNamePrefix = state.isInputDesignMode ? "Input Design" : "Design";
    let defaultIndex = currentSaved.length + 1;
    let defaultName = defaultNamePrefix + " " + defaultIndex;
    const used = new Set(currentSaved.map((d) => d.name.trim().toLowerCase()));
    while (used.has(defaultName.toLowerCase())) { defaultIndex++; defaultName = defaultNamePrefix + " " + defaultIndex; }
    if (!state.saveName) state.saveName = defaultName;

    app.innerHTML = '<div class="config-header"><div><div class="config-title-row"><span class="title-bar"></span><h2>Design configurator</h2></div><p class="config-subtitle">Combine winning ' + (isLayerStudy ? "layer assets" : "elements") + ' and preview the total coefficient.</p></div><div class="config-controls">' +
      (!state.isInputDesignMode ? '<div class="metric-toggle">' + METRICS.map((m) => '<button type="button" class="metric-btn' + (state.activeMetric === m ? " active" : "") + '" data-metric="' + esc(m) + '">' + esc(m) + '</button>').join("") + '</div><div class="segment-wrap"><select id="segment-select">' + segmentOptions.map((s) => '<option value="' + esc(s.id) + '"' + (s.id === state.activeSegmentId ? " selected" : "") + '>' + esc(s.label) + '</option>').join("") + '</select></div>' : "") +
      '<button type="button" class="btn' + (state.isInputDesignMode ? " btn-primary" : " btn-outline") + '" id="toggle-input-design">' + (state.isInputDesignMode ? "Input Design On" : "Input Design") + '</button>' +
      '<button type="button" class="btn btn-compare" id="open-compare">Compare Saved' + (currentSaved.length ? ' <span class="badge">' + currentSaved.length + '</span>' : '') + '</button></div></div>' +
      '<div class="config-body"><div class="left-col"><div class="card preview-card"><div class="preview-toolbar">' +
      (isLayerStudy ? '<button type="button" class="chip' + (state.showLayerBackground ? " active" : "") + '" id="toggle-bg">Background</button><button type="button" class="chip" id="download-preview">Download</button>' : '<span></span>') +
      '<div class="toolbar-right">' + (!isLayerStudy && hasPreview ? '<button type="button" class="icon-btn primary" id="open-save" title="Save">💾</button><button type="button" class="icon-btn" id="open-preview" title="Preview">👁</button>' : '') +
      (!state.isInputDesignMode ? '<button type="button" class="chip link" id="best-mix">Best Mix</button>' : '') + '<button type="button" class="chip muted" id="clear-selection">Clear</button></div></div>' +
      '<div class="preview-area">' + renderPreviewHtml(selectedElements, { backgroundUrl, aspectRatio, showBackground: state.showLayerBackground }) +
      (isLayerStudy && hasPreview ? '<div class="layer-save-btns"><button type="button" class="icon-btn primary" id="open-save-layer" title="Save">💾</button><button type="button" class="icon-btn dark" id="open-preview-layer" title="Preview">👁</button></div>' : '') + '</div>' +
      '<div class="preview-footer">' + (state.isInputDesignMode ?
        '<div><div class="footer-label">Input Design</div><div class="footer-sub">' + selectedElements.length + ' selected</div></div><button type="button" class="btn btn-primary" id="check-insights"' + (selectedElements.length ? "" : " disabled") + '>Check Insights</button>' :
        '<div><div class="footer-label">Total Coefficient</div><div class="footer-sub">' + esc((activeSegment && activeSegment.label) || "Overall") + '</div></div><div class="footer-value">' + formatValue(totalCoefficient, state.activeMetric) + '</div>') + '</div></div>' +
      (state.isInputDesignMode && state.showInputInsights && selectedElements.length ? '<div class="card insights-card"><div class="insights-head"><div><h3>Input Design Insights</h3><p>Summed coefficients for your selected elements across all segments.</p></div><select id="insight-metric">' + METRICS.map((m) => '<option value="' + esc(m) + '"' + (state.activeInputInsightMetric === m ? " selected" : "") + '>' + esc(m) + '</option>').join("") + '</select></div><div class="insights-list">' + (inputInsights[state.activeInputInsightMetric] || []).map((row) => '<div class="insight-row"><span>' + esc(row.label) + '</span><span class="' + (row.value >= 0 ? "pos" : "neg") + '">' + (row.value >= 0 ? "+" : "") + formatValue(row.value, state.activeInputInsightMetric) + '</span></div>').join("") + '</div></div>' : '') +
      (selectedElements.length ? '<details class="card selection-card"' + (state.isSelectionOpen ? " open" : "") + '><summary>Active Selection (' + selectedElements.length + ')</summary><div class="selection-list">' + selectedElements.map((element) => '<div class="selection-item"><div class="selection-left">' + (element.imageUrl ? '<img src="' + esc(element.imageUrl) + '" alt="">' : '<span class="type-icon">T</span>') + '<div><strong>' + esc(element.name) + '</strong><small>' + esc(element.category) + '</small></div></div><div class="selection-right">' + (!state.isInputDesignMode ? '<span class="' + (element.value >= 0 ? "pos" : "neg") + '">' + (element.value >= 0 ? "+" : "") + formatValue(element.value, state.activeMetric) + '</span>' : '') + '<button type="button" class="remove-btn" data-remove="' + esc(element.categoryKey) + '">×</button></div></div>').join("") + '</div></details>' : '') +
      '</div><div class="right-col">' + (!isLayerStudy && selectedElements.length >= MAX_NON_LAYER ? '<div class="warn">Maximum 4 elements can be selected. Remove one to add another category.</div>' : '') +
      categories.map((category) => {
        const selectedId = state.selectedByCategory[category.key];
        const isOpen = state.openCategoryNames[category.key];
        const elements = state.isInputDesignMode ? category.elements : [...category.elements].sort((a, b) => b.value - a.value);
        return '<div class="category-card"><button type="button" class="category-head" data-toggle-category="' + esc(category.key) + '"><div><div class="category-title-row"><h3>' + (isLayerStudy ? "Layer" : "Category") + ': ' + esc(category.name) + '</h3>' + (selectedId ? '<span class="selected-pill">Selected</span>' : '') + '</div><p>' + category.elements.length + ' option' + (category.elements.length === 1 ? "" : "s") + (isLayerStudy ? ' · z-index ' + category.zIndex : '') + '</p></div><span class="chev">' + (isOpen ? "▲" : "▼") + '</span></button>' +
          (isOpen ? '<div class="category-body"><div class="element-grid">' + elements.map((element) => {
            const isSelected = selectedId === element.id;
            const disabled = !isLayerStudy && !isSelected && !selectedId && selectedElements.length >= MAX_NON_LAYER;
            const isText = !element.imageUrl || (element.elementType || "").toLowerCase() === "text";
            return '<button type="button" class="element-card' + (isSelected ? " selected" : "") + (disabled ? " disabled" : "") + '" data-category="' + esc(category.key) + '" data-element="' + esc(element.id) + '"' + (disabled ? " disabled" : "") + '><div class="element-thumb">' + (isText ? '<span class="type-icon">T</span>' : '<img src="' + esc(element.imageUrl) + '" alt="">') + '</div><div class="element-meta"><div class="element-name">' + esc(element.name) + '</div><div class="element-foot">' + (!state.isInputDesignMode ? '<span class="score ' + (element.value >= 0 ? "pos" : "neg") + '">' + (element.value >= 0 ? "+" : "") + formatValue(element.value, state.activeMetric) + '</span>' : '<span></span>') + (!isText ? '<span class="dl" data-download="' + esc(element.imageUrl) + '" data-name="' + esc(element.name) + '">⬇</span>' : '') + '</div></div></button>';
          }).join("") + '</div></div>' : '') + '</div>';
      }).join("") + '</div></div>' +
      renderModals(currentSaved, defaultName);

    bindEvents();
  }

  function renderModals(currentSaved, defaultName) {
    let html = "";
    if (state.isSaveModalOpen) {
      html += '<div class="modal-backdrop" id="save-modal"><div class="modal"><h3>Save design</h3><input id="save-name-input" value="' + esc(state.saveName || defaultName) + '"><p class="error">' + esc(state.saveError || "") + '</p><div class="modal-actions"><button type="button" class="btn btn-outline" id="close-save">Cancel</button><button type="button" class="btn btn-primary" id="confirm-save">Save</button></div></div></div>';
    }
    if (state.isComparePanelOpen) {
      html += '<div class="modal-backdrop" id="compare-panel"><aside class="side-panel"><div class="side-head"><div><h3>Compare saved designs</h3><p>Select 2 to 4 designs to compare.</p></div><button type="button" class="close-btn" id="close-compare">×</button></div><div class="side-body">' +
        (currentSaved.length ? currentSaved.map((design) => {
          const checked = state.selectedCompareIds.includes(design.id);
          const disabled = !checked && state.selectedCompareIds.length >= 4;
          const meta = design.design_type === "input" ? design.selection_count + " selected" : design.metric + " · " + (design.segment_label || "Overall") + " · " + design.selection_count + " selected";
          return '<div class="compare-item' + (checked ? " checked" : "") + '"><label><input type="checkbox" data-compare-id="' + esc(design.id) + '"' + (checked ? " checked" : "") + (disabled ? " disabled" : "") + '><span><strong>' + esc(design.name) + '</strong><small>' + esc(meta) + '</small></span></label><div class="compare-foot"><span class="pill">' + (design.design_type === "input" ? "Input Design" : formatValue(design.total_coefficient || 0, design.metric)) + '</span><button type="button" class="delete-btn" data-delete="' + esc(design.id) + '">Delete</button></div></div>';
        }).join("") : '<div class="empty">No saved designs yet</div>') +
        (state.compareError ? '<p class="error">' + esc(state.compareError) + '</p>' : '') +
        '</div><div class="side-foot"><button type="button" class="btn btn-primary full" id="run-compare"' + (state.selectedCompareIds.length < 2 || state.selectedCompareIds.length > 4 ? " disabled" : "") + '>Compare (' + state.selectedCompareIds.length + ')</button></div></aside></div>';
    }
    if (state.compareDesigns.length) {
      html += '<div class="compare-overlay" id="compare-overlay"><button type="button" class="close-overlay" id="close-overlay">×</button><div class="compare-grid">' + state.compareDesigns.map((design) => {
        const elements = getSavedDesignElements(design);
        const insights = (design.configuration && design.configuration.input_insights) || buildInputDesignInsights(state.analysisData, design.configuration && design.configuration.selected_by_category || {});
        return '<div class="compare-card"><h4>' + esc(design.name) + '</h4><p class="compare-meta">' + (design.design_type === "input" ? "Input Design" : esc(design.metric + " · " + (design.segment_label || "Overall"))) + '</p>' +
          renderPreviewHtml(elements, { backgroundUrl: design.configuration && (design.configuration.show_layer_background ? design.configuration.background_url : null), aspectRatio: design.configuration && design.configuration.aspect_ratio, showBackground: true }) +
          (design.design_type === "input" ? '<div class="insight-box"><div class="insight-head"><strong>Segment Insights</strong><select class="compare-insight-metric" data-design="' + esc(design.id) + '">' + METRICS.map((m) => '<option>' + esc(m) + '</option>').join("") + '</select></div><div class="insight-rows" data-insight-rows="' + esc(design.id) + '">' + ((insights["Top Down"] || []).map((row) => '<div class="insight-row"><span>' + esc(row.label) + '</span><span class="' + (row.value >= 0 ? "pos" : "neg") + '">' + (row.value >= 0 ? "+" : "") + formatValue(row.value, "Top Down") + '</span></div>').join("")) + '</div></div>' :
            '<div class="total-box"><span>Total Coefficient</span><strong>' + formatValue(design.total_coefficient || 0, design.metric) + '</strong></div>') +
          '<details><summary>Active Selection (' + elements.length + ')</summary><div class="selection-list">' + elements.map((e) => '<div class="selection-item"><span>' + esc(e.name) + '</span></div>').join("") + '</div></details></div>';
      }).join("") + '</div></div>';
    }
    if (state.lightboxImage) {
      html += '<div class="lightbox" id="lightbox"><button type="button" class="close-overlay" id="close-lightbox">×</button><img src="' + esc(state.lightboxImage.url) + '" alt="' + esc(state.lightboxImage.name) + '"><p>' + esc(state.lightboxImage.name) + '</p></div>';
    }
    if (state.previewFullscreen) {
      html += '<div class="lightbox" id="preview-lightbox"><button type="button" class="close-overlay" id="close-preview-lightbox">×</button>' + renderPreviewHtml(getSelectedElements(), { backgroundUrl: getBackgroundUrl(state.analysisData), aspectRatio: getLayerAspectRatio(state.analysisData), showBackground: state.showLayerBackground }) + '</div>';
    }
    return html;
  }

  function bindEvents() {
    document.querySelectorAll("[data-metric]").forEach((btn) => btn.addEventListener("click", () => { state.activeMetric = btn.getAttribute("data-metric"); state.activeSegmentId = ""; render(); }));
    const segmentSelect = document.getElementById("segment-select");
    if (segmentSelect) segmentSelect.addEventListener("change", (e) => { state.activeSegmentId = e.target.value; render(); });
    const toggleInput = document.getElementById("toggle-input-design");
    if (toggleInput) toggleInput.addEventListener("click", () => { state.isInputDesignMode = !state.isInputDesignMode; state.savedDesignType = state.isInputDesignMode ? "input" : "configurator"; state.showInputInsights = false; render(); });
    const openCompare = document.getElementById("open-compare");
    if (openCompare) openCompare.addEventListener("click", () => { state.isComparePanelOpen = true; state.compareError = null; render(); });
    const toggleBg = document.getElementById("toggle-bg");
    if (toggleBg) toggleBg.addEventListener("click", () => { state.showLayerBackground = !state.showLayerBackground; render(); });
    const bestMix = document.getElementById("best-mix");
    if (bestMix) bestMix.addEventListener("click", () => { const cats = getCategories(); const nextSelection = isLayerStudy ? buildConstraintAwareLayerBestMix(cats, state.designConstraints) : buildDefaultSelection(cats); if (!nextSelection) { alert("No valid Best Mix exists with the current design constraints. Please relax constraints or review layer images."); return; } state.selectedByCategory = nextSelection; state.openCategoryNames = Object.fromEntries(cats.map((c) => [c.key, Boolean(state.selectedByCategory[c.key])])); render(); });
    const clearBtn = document.getElementById("clear-selection");
    if (clearBtn) clearBtn.addEventListener("click", () => { state.selectedByCategory = {}; render(); });
    const openSave = document.getElementById("open-save") || document.getElementById("open-save-layer");
    if (openSave) openSave.addEventListener("click", () => { state.isSaveModalOpen = true; state.saveError = null; render(); });
    const openPreview = document.getElementById("open-preview") || document.getElementById("open-preview-layer");
    if (openPreview) openPreview.addEventListener("click", () => { state.previewFullscreen = true; render(); });
    const checkInsights = document.getElementById("check-insights");
    if (checkInsights) checkInsights.addEventListener("click", () => { state.showInputInsights = true; render(); });
    const insightMetric = document.getElementById("insight-metric");
    if (insightMetric) insightMetric.addEventListener("change", (e) => { state.activeInputInsightMetric = e.target.value; render(); });
    document.querySelectorAll("[data-toggle-category]").forEach((btn) => btn.addEventListener("click", () => { const key = btn.getAttribute("data-toggle-category"); state.openCategoryNames[key] = !state.openCategoryNames[key]; render(); }));
    document.querySelectorAll(".element-card").forEach((btn) => btn.addEventListener("click", () => {
      const categoryKey = btn.getAttribute("data-category");
      const elementId = btn.getAttribute("data-element");
      const current = state.selectedByCategory[categoryKey];
      if (current === elementId) delete state.selectedByCategory[categoryKey];
      else {
        const count = Object.keys(state.selectedByCategory).length;
        if (!isLayerStudy && !current && count >= MAX_NON_LAYER) return;
        state.selectedByCategory[categoryKey] = elementId;
      }
      render();
    }));
    document.querySelectorAll("[data-remove]").forEach((btn) => btn.addEventListener("click", (e) => { e.stopPropagation(); delete state.selectedByCategory[btn.getAttribute("data-remove")]; render(); }));
    document.querySelectorAll("[data-download]").forEach((btn) => btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const url = btn.getAttribute("data-download");
      const name = btn.getAttribute("data-name") || "element";
      const a = document.createElement("a"); a.href = url; a.download = name; a.click();
    }));
    const closeSave = document.getElementById("close-save");
    if (closeSave) closeSave.addEventListener("click", () => { state.isSaveModalOpen = false; state.saveError = null; render(); });
    const confirmSave = document.getElementById("confirm-save");
    if (confirmSave) confirmSave.addEventListener("click", () => saveDesign());
    const saveNameInput = document.getElementById("save-name-input");
    if (saveNameInput) saveNameInput.addEventListener("input", (e) => { state.saveName = e.target.value; });
    const closeCompare = document.getElementById("close-compare");
    if (closeCompare) closeCompare.addEventListener("click", () => { state.isComparePanelOpen = false; render(); });
    document.querySelectorAll("[data-compare-id]").forEach((input) => input.addEventListener("change", () => {
      const id = input.getAttribute("data-compare-id");
      if (input.checked) { if (state.selectedCompareIds.length < 4) state.selectedCompareIds.push(id); }
      else state.selectedCompareIds = state.selectedCompareIds.filter((x) => x !== id);
      render();
    }));
    document.querySelectorAll("[data-delete]").forEach((btn) => btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-delete");
      state.savedDesigns[state.savedDesignType] = getCurrentSavedDesigns().filter((d) => d.id !== id);
      state.selectedCompareIds = state.selectedCompareIds.filter((x) => x !== id);
      state.compareDesigns = state.compareDesigns.filter((d) => d.id !== id);
      persistSavedDesigns(); render();
    }));
    const runCompare = document.getElementById("run-compare");
    if (runCompare) runCompare.addEventListener("click", () => {
      if (state.selectedCompareIds.length < 2 || state.selectedCompareIds.length > 4) { state.compareError = "Select between 2 and 4 saved designs."; render(); return; }
      state.compareDesigns = getCurrentSavedDesigns().filter((d) => state.selectedCompareIds.includes(d.id));
      state.isComparePanelOpen = false; render();
    });
    const closeOverlay = document.getElementById("close-overlay");
    if (closeOverlay) closeOverlay.addEventListener("click", () => { state.compareDesigns = []; render(); });
    const closeLightbox = document.getElementById("close-lightbox");
    if (closeLightbox) closeLightbox.addEventListener("click", () => { state.lightboxImage = null; render(); });
    const closePreviewLightbox = document.getElementById("close-preview-lightbox");
    if (closePreviewLightbox) closePreviewLightbox.addEventListener("click", () => { state.previewFullscreen = false; render(); });
    document.querySelectorAll(".compare-insight-metric").forEach((select) => select.addEventListener("change", (e) => {
      const designId = select.getAttribute("data-design");
      const design = state.compareDesigns.find((d) => d.id === designId);
      if (!design) return;
      const insights = (design.configuration && design.configuration.input_insights) || buildInputDesignInsights(state.analysisData, design.configuration && design.configuration.selected_by_category || {});
      const rows = insights[e.target.value] || [];
      const container = document.querySelector('[data-insight-rows="' + designId + '"]');
      if (container) container.innerHTML = rows.map((row) => '<div class="insight-row"><span>' + esc(row.label) + '</span><span class="' + (row.value >= 0 ? "pos" : "neg") + '">' + (row.value >= 0 ? "+" : "") + formatValue(row.value, e.target.value) + '</span></div>').join("");
    }));
    const downloadPreview = document.getElementById("download-preview");
    if (downloadPreview) downloadPreview.addEventListener("click", () => {
      const node = document.querySelector(".preview-area .layer-preview, .preview-area .grid-preview");
      if (!node) return;
      import("https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/+esm").then(({ default: html2canvas }) => html2canvas(node).then((canvas) => {
        const a = document.createElement("a"); a.href = canvas.toDataURL("image/png"); a.download = "preview.png"; a.click();
      })).catch(() => alert("Download preview is unavailable offline."));
    });
  }

  function saveDesign() {
    const name = (state.saveName || "").trim();
    if (!name) { state.saveError = "Enter a design name."; render(); return; }
    const selectedElements = getSelectedElements();
    if (!selectedElements.length && !(isLayerStudy && state.showLayerBackground && getBackgroundUrl(state.analysisData))) {
      state.saveError = "Select at least one element before saving."; render(); return;
    }
    const activeSegment = getActiveSegment();
    const inputInsights = buildInputDesignInsights(state.analysisData, state.selectedByCategory);
    const configuration = {
      metric: state.activeMetric,
      study_type: studyType,
      design_type: state.savedDesignType,
      segment: activeSegment ? { id: activeSegment.id, label: activeSegment.label, section_key: activeSegment.sectionKey, value_key: activeSegment.valueKey } : undefined,
      selected_by_category: state.selectedByCategory,
      selected_elements: selectedElements.map(slimSelectedElement),
      input_insights: state.isInputDesignMode ? inputInsights : undefined,
      show_layer_background: isLayerStudy ? state.showLayerBackground : false,
      aspect_ratio: getLayerAspectRatio(state.analysisData),
      total_coefficient: selectedElements.reduce((sum, e) => sum + e.value, 0),
    };
    const normalized = name.toLowerCase();
    if (getCurrentSavedDesigns().some((d) => d.name.trim().toLowerCase() === normalized)) {
      state.saveError = "A saved design with this name already exists."; render(); return;
    }
    const now = new Date().toISOString();
    const design = {
      id: uuid(), study_id: studyId, name,
      design_type: state.savedDesignType,
      study_type: studyType,
      metric: state.activeMetric,
      segment_label: activeSegment && activeSegment.label,
      selection_count: selectedElements.length,
      total_coefficient: configuration.total_coefficient,
      configuration,
      created_at: now,
      updated_at: now,
    };
    state.savedDesigns[state.savedDesignType] = [hydrateSavedDesign(design), ...getCurrentSavedDesigns()];
    persistSavedDesigns();
    state.isSaveModalOpen = false;
    state.saveError = null;
    render();
  }

  seedSavedDesigns();
  state.showLayerBackground = isLayerStudy && Boolean(getBackgroundUrl(state.analysisData));
  render();
  } catch (error) {
    const app = document.getElementById("configurator-app");
    if (app) {
      app.innerHTML = '<div class="error" style="padding:24px;border:1px solid #fecaca;background:#fef2f2;border-radius:16px;color:#991b1b;">Failed to load design configurator. ' + String(error && error.message ? error.message : error) + '</div>';
    }
    console.error("Design configurator export failed", error);
  }
})();
`;
}
