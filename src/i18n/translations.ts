export type TranslationKeys = {
  // Header
  appTitle: string;
  appDescription: string;
  
  // Status
  statusLabel: string;
  statusEnabled: string;
  statusDisabled: string;
  
  // Main toggle
  toggleButton: string;
  toggleButtonDisable: string;
  
  // Image description language
  imageDescLangLabel: string;
  imageDescLangHint: string;
  
  // Voice settings
  voiceLabel: string;
  voiceAuto: string;
  voiceHint: string;
  
  // ElevenLabs
  useElevenLabsLabel: string;
  elevenLabsKeyLabel: string;
  elevenLabsKeyPlaceholder: string;
  saveKeyButton: string;
  savedBadge: string;
  elevenLabsVoiceLabel: string;
  elevenLabsVoicePlaceholder: string;
  refreshVoicesButton: string;
  elevenLabsHint: string;
  refreshUsageButton: string;
  usageLabel: (used: number, limit: number) => string;
  quotaHint: string;
  
  // Gemini
  geminiUsageTitle: string;
  geminiUsageText: (used: number, limit: number) => string;
  geminiRateLimited: (seconds: number) => string;
  geminiNoRequests: string;
  geminiEstimateHint: string;
  
  // Speech rate
  speechRateLabel: string;
  speechRateHint: string;
  
  // AI settings
  useAiLabel: string;
  useAiHint: string;
  geminiKeyLabel: string;
  geminiKeyPlaceholder: string;
  saveGeminiKeyButton: string;
  
  // Action buttons
  announceHoverButton: string;
  announceFocusButton: string;
  
  // Help section
  helpTitle: string;
  helpItem1: string;
  helpItem2: string;
  helpItem3: string;
  helpItem4: string;
  helpItem5: string;
  helpItem6: string;
  
  // Status messages
  loadingState: string;
  notAvailableState: string;
  statusEnabledMessage: string;
  statusDisabledMessage: string;
  
  // Errors
  errorAddKeyFirst: string;
  
  // UI Language selector
  interfaceLangLabel: string;
};

export const translations: Record<string, TranslationKeys> = {
  "en-US": {
    appTitle: "Blind Helper",
    appDescription: "Turn on the helper to hear descriptions of elements as you browse.",
    
    statusLabel: "Status",
    statusEnabled: "On",
    statusDisabled: "Off",
    
    toggleButton: "Turn on helper",
    toggleButtonDisable: "Turn off helper",
    
    imageDescLangLabel: "Image description language",
    imageDescLangHint: "Controls the language Gemini uses for AI image descriptions.",
    
    voiceLabel: "Preferred voice",
    voiceAuto: "Auto (match language)",
    voiceHint: "If a language sounds silent or has an accent, try a different voice here.",
    
    useElevenLabsLabel: "Use cloud voice (better quality)",
    elevenLabsKeyLabel: "ElevenLabs API key",
    elevenLabsKeyPlaceholder: "sk_...",
    saveKeyButton: "Save key",
    savedBadge: "saved",
    elevenLabsVoiceLabel: "Cloud voice (from your account)",
    elevenLabsVoicePlaceholder: "Save API key to load voices",
    refreshVoicesButton: "Refresh voices",
    elevenLabsHint: "Cloud voices work better for languages without good local voices.",
    refreshUsageButton: "Refresh usage",
    usageLabel: (used, limit) => `${used.toLocaleString()} / ${limit.toLocaleString()} characters used`,
    quotaHint: "This uses your ElevenLabs character quota, separate from the AI quota below.",
    
    geminiUsageTitle: "AI image analysis usage",
    geminiUsageText: (used, limit) => `${used} / ${limit} requests used in the last 24 hours.`,
    geminiRateLimited: (seconds) => `Temporarily limited. Retrying in ${seconds}s. Using basic descriptions.`,
    geminiNoRequests: "No AI image analysis requests yet.",
    geminiEstimateHint: "Based on requests from this browser. Free tier resets every ~24 hours.",
    
    speechRateLabel: "Speech speed",
    speechRateHint: "Use Alt+Shift+Up/Down to adjust speed without opening this popup.",
    
    useAiLabel: "Use AI to analyze images and elements",
    useAiHint: "Get a free API key from Google AI Studio to enable smart image descriptions.",
    geminiKeyLabel: "Google Gemini API key",
    geminiKeyPlaceholder: "AIza...",
    saveGeminiKeyButton: "Save API key",
    
    announceHoverButton: "Announce hovered element",
    announceFocusButton: "Announce focused element",
    
    helpTitle: "How to use",
    helpItem1: "Turn on the helper from this popup.",
    helpItem2: "Hover over elements to hear descriptions.",
    helpItem3: "Press Tab to navigate and hear labels.",
    helpItem4: "Press Alt+Shift+Up/Down to change speech speed.",
    helpItem5: "Choose a language to hear descriptions in that language.",
    helpItem6: "Add a Google Gemini key for AI-powered image analysis.",
    
    loadingState: "Loading...",
    notAvailableState: "Not available on this site.",
    statusEnabledMessage: "Helper is on",
    statusDisabledMessage: "Helper is off",
    
    errorAddKeyFirst: "Add an API key first.",
    
    interfaceLangLabel: "Interface language",
  },
  
  "ka-GE": {
    appTitle: "ბრმის დამხმარე",
    appDescription: "ჩართეთ დამხმარე, რომ მოისმინოთ ელემენტების აღწერა.",
    
    statusLabel: "სტატუსი",
    statusEnabled: "ჩართულია",
    statusDisabled: "გამორთულია",
    
    toggleButton: "დამხმარის ჩართვა",
    toggleButtonDisable: "დამხმარის გამორთვა",
    
    imageDescLangLabel: "სურათის აღწერის ენა",
    imageDescLangHint: "კონტროლს ახდენს ენა, რომელსაც Gemini იყენებს AI სურათის აღწერებისთვის.",
    
    voiceLabel: "რჩეული ხმა",
    voiceAuto: "ავტო (ენის მიხედვით)",
    voiceHint: "თუ ენა ჩუმად ან accent-ით ჟღერს, სცადეთ სხვა ხმა.",
    
    useElevenLabsLabel: "ღრუბლის ხმის გამოყენება (უკეთესი ხარისხი)",
    elevenLabsKeyLabel: "ElevenLabs API გასაღები",
    elevenLabsKeyPlaceholder: "sk_...",
    saveKeyButton: "გასაღების შენახვა",
    savedBadge: "შენახულია",
    elevenLabsVoiceLabel: "ღრუბლის ხმა (თქვენი ანგარიშიდან)",
    elevenLabsVoicePlaceholder: "ხმების ჩასატვირთად შეინახეთ API გასაღები",
    refreshVoicesButton: "ხმების განახლება",
    elevenLabsHint: "ღრუბლის ხმები უკეთესად მუშაობს ენებისთვის, რომლებსაც კარგი ლოკალური ხმა არ აქვს.",
    refreshUsageButton: "გამოყენების განახლება",
    usageLabel: (used, limit) => `${used.toLocaleString()} / ${limit.toLocaleString()} გამოყენებული სიმბოლო`,
    quotaHint: "ეს იყენებს თქვენს ElevenLabs სიმბოლო ლიმიტს, ცალკე AI ლიმიტისგან.",
    
    geminiUsageTitle: "AI სურათის ანალიზის გამოყენება",
    geminiUsageText: (used, limit) => `ბოლო 24 საათში გამოყენებულია ${used} / ${limit} მოთხოვნა.`,
    geminiRateLimited: (seconds) => `დროებით შეზღუდულია. თავიდან ცდა ${seconds} წამში. ძირითადი აღწერების გამოყენება.`,
    geminiNoRequests: "AI სურათის ანალიზის მოთხოვნები ჯერ არ არის.",
    geminiEstimateHint: "ამ ბრაუზერის მოთხოვნებზე დაფუძნებული. უფასო ფენა განახლდება ~24 საათში.",
    
    speechRateLabel: "საუბრის სიჩქარე",
    speechRateHint: "Alt+Shift+Up/Down გამოიყენეთ სიჩქარის შესაცვლელად ამ ფანჯრის გახსნის გარეშე.",
    
    useAiLabel: "AI-ის გამოყენება სურათებისა და ელემენტების ანალიზისთვის",
    useAiHint: "ჩაიჭირეთ უფასო API გასაღები Google AI Studio-დან ჭკვიანი სურათის აღწერებისთვის.",
    geminiKeyLabel: "Google Gemini API გასაღები",
    geminiKeyPlaceholder: "AIza...",
    saveGeminiKeyButton: "API გასაღების შენახვა",
    
    announceHoverButton: "მაუსის ზემოთ მდგარი ელემენტის გაცხადება",
    announceFocusButton: "ფოკუსის მქონე ელემენტის გაცხადება",
    
    helpTitle: "როგორ გამოიყენოთ",
    helpItem1: "ჩართეთ დამხმარე ამ ფანჯარიდან.",
    helpItem2: "გადაიტანეთ მაუსი ელემენტებზე აღწერების მოსასმენად.",
    helpItem3: "Tab-ს დააჭირეთ ნავიგაციისთვის და ჭდეების მოსასმენად.",
    helpItem4: "Alt+Shift+Up/Down დააჭირეთ საუბრის სიჩქარის შესაცვლელად.",
    helpItem5: "აირჩიეთ ენა აღწერების მოსასმენად ამ ენაზე.",
    helpItem6: "დაამატეთ Google Gemini გასაღები AI სურათის ანალიზისთვის.",
    
    loadingState: "ჩატვირთვა...",
    notAvailableState: "მიუწვდომელია ამ საიტზე.",
    statusEnabledMessage: "დამხმარე ჩართულია",
    statusDisabledMessage: "დამხმარე გამორთულია",
    
    errorAddKeyFirst: "ჯერ დაამატეთ API გასაღები.",
    
    interfaceLangLabel: "ინტერფეისის ენა",
  },
  
  "ru-RU": {
    appTitle: "Помощник для слепых",
    appDescription: "Включите помощник, чтобы слышать описания элементов.",
    
    statusLabel: "Статус",
    statusEnabled: "Включено",
    statusDisabled: "Выключено",
    
    toggleButton: "Включить помощника",
    toggleButtonDisable: "Выключить помощника",
    
    imageDescLangLabel: "Язык описания изображений",
    imageDescLangHint: "Управляет языком, который Gemini использует для AI-описаний.",
    
    voiceLabel: "Предпочтительный голос",
    voiceAuto: "Авто (по языку)",
    voiceHint: "Если язык звучит тихо или с акцентом, попробуйте другой голос.",
    
    useElevenLabsLabel: "Использовать облачный голос (лучше качество)",
    elevenLabsKeyLabel: "ElevenLabs API ключ",
    elevenLabsKeyPlaceholder: "sk_...",
    saveKeyButton: "Сохранить ключ",
    savedBadge: "сохранено",
    elevenLabsVoiceLabel: "Облачный голос (из вашего аккаунта)",
    elevenLabsVoicePlaceholder: "Сохраните ключ для загрузки голосов",
    refreshVoicesButton: "Обновить голоса",
    elevenLabsHint: "Облачные голоса лучше работают для языков без хороших локальных голосов.",
    refreshUsageButton: "Обновить использование",
    usageLabel: (used, limit) => `Использовано ${used.toLocaleString()} / ${limit.toLocaleString()} символов`,
    quotaHint: "Использует вашу квоту ElevenLabs, отдельно от AI квоты ниже.",
    
    geminiUsageTitle: "Использование AI анализа изображений",
    geminiUsageText: (used, limit) => `Использовано ${used} / ${limit} запросов за последние 24 часа.`,
    geminiRateLimited: (seconds) => `Временно ограничено. Повтор через ${seconds}с. Используются базовые описания.`,
    geminiNoRequests: "AI запросов на анализ изображений пока нет.",
    geminiEstimateHint: "На основе запросов из этого браузера. Бесплатный лимит сбрасывается каждые ~24 часа.",
    
    speechRateLabel: "Скорость речи",
    speechRateHint: "Используйте Alt+Shift+Up/Down для изменения скорости без открытия этого окна.",
    
    useAiLabel: "Использовать AI для анализа изображений",
    useAiHint: "Получите бесплатный ключ на Google AI Studio для умных описаний.",
    geminiKeyLabel: "Google Gemini API ключ",
    geminiKeyPlaceholder: "AIza...",
    saveGeminiKeyButton: "Сохранить ключ",
    
    announceHoverButton: "Объявить элемент под курсором",
    announceFocusButton: "Объявить элемент в фокусе",
    
    helpTitle: "Как использовать",
    helpItem1: "Включите помощника из этого окна.",
    helpItem2: "Наводите курсор на элементы для прослушивания описаний.",
    helpItem3: "Используйте Tab для навигации и прослушивания меток.",
    helpItem4: "Нажмите Alt+Shift+Up/Down для изменения скорости речи.",
    helpItem5: "Выберите язык для прослушивания описаний на этом языке.",
    helpItem6: "Добавьте ключ Google Gemini для AI анализа изображений.",
    
    loadingState: "Загрузка...",
    notAvailableState: "Недоступно на этом сайте.",
    statusEnabledMessage: "Помощник включен",
    statusDisabledMessage: "Помощник выключен",
    
    errorAddKeyFirst: "Сначала добавьте API ключ.",
    
    interfaceLangLabel: "Язык интерфейса",
  },
  
  "es-ES": {
    appTitle: "Ayuda para Ciegos",
    appDescription: "Activa el asistente para escuchar descripciones de elementos.",
    
    statusLabel: "Estado",
    statusEnabled: "Activado",
    statusDisabled: "Desactivado",
    
    toggleButton: "Activar asistente",
    toggleButtonDisable: "Desactivar asistente",
    
    imageDescLangLabel: "Idioma de descripción de imágenes",
    imageDescLangHint: "Controla el idioma que Gemini usa para descripciones de IA.",
    
    voiceLabel: "Voz preferida",
    voiceAuto: "Auto (por idioma)",
    voiceHint: "Si un idioma suena silencioso o con acento, prueba otra voz.",
    
    useElevenLabsLabel: "Usar voz en la nube (mejor calidad)",
    elevenLabsKeyLabel: "Clave API de ElevenLabs",
    elevenLabsKeyPlaceholder: "sk_...",
    saveKeyButton: "Guardar clave",
    savedBadge: "guardado",
    elevenLabsVoiceLabel: "Voz en la nube (de tu cuenta)",
    elevenLabsVoicePlaceholder: "Guarda la clave para cargar voces",
    refreshVoicesButton: "Actualizar voces",
    elevenLabsHint: "Las voces en la nube funcionan mejor para idiomas sin buenas voces locales.",
    refreshUsageButton: "Actualizar uso",
    usageLabel: (used, limit) => `${used.toLocaleString()} / ${limit.toLocaleString()} caracteres usados`,
    quotaHint: "Usa tu cuota de ElevenLabs, separada de la cuota de IA abajo.",
    
    geminiUsageTitle: "Uso de análisis de imágenes con IA",
    geminiUsageText: (used, limit) => `${used} / ${limit} solicitudes usadas en las últimas 24 horas.`,
    geminiRateLimited: (seconds) => `Limitado temporalmente. Reintentando en ${seconds}s. Usando descripciones básicas.`,
    geminiNoRequests: "Sin solicitudes de análisis de imágenes con IA aún.",
    geminiEstimateHint: "Basado en solicitudes de este navegador. El límite gratuito se reinicia cada ~24 horas.",
    
    speechRateLabel: "Velocidad del habla",
    speechRateHint: "Usa Alt+Shift+Up/Down para ajustar la velocidad sin abrir esta ventana.",
    
    useAiLabel: "Usar IA para analizar imágenes y elementos",
    useAiHint: "Obtén una clave gratuita en Google AI Studio para descripciones inteligentes.",
    geminiKeyLabel: "Clave API de Google Gemini",
    geminiKeyPlaceholder: "AIza...",
    saveGeminiKeyButton: "Guardar clave API",
    
    announceHoverButton: "Anunciar elemento bajo el cursor",
    announceFocusButton: "Anunciar elemento enfocado",
    
    helpTitle: "Cómo usar",
    helpItem1: "Activa el asistente desde esta ventana.",
    helpItem2: "Pasa el cursor sobre elementos para escuchar descripciones.",
    helpItem3: "Usa Tab para navegar y escuchar etiquetas.",
    helpItem4: "Presiona Alt+Shift+Up/Down para cambiar la velocidad del habla.",
    helpItem5: "Elige un idioma para escuchar descripciones en ese idioma.",
    helpItem6: "Añade una clave de Google Gemini para análisis de imágenes con IA.",
    
    loadingState: "Cargando...",
    notAvailableState: "No disponible en este sitio.",
    statusEnabledMessage: "Asistente activado",
    statusDisabledMessage: "Asistente desactivado",
    
    errorAddKeyFirst: "Añade una clave API primero.",
    
    interfaceLangLabel: "Idioma de la interfaz",
  },
  
  "fr-FR": {
    appTitle: "Assistant pour Aveugles",
    appDescription: "Activez l'assistant pour entendre les descriptions des éléments.",
    
    statusLabel: "Statut",
    statusEnabled: "Activé",
    statusDisabled: "Désactivé",
    
    toggleButton: "Activer l'assistant",
    toggleButtonDisable: "Désactiver l'assistant",
    
    imageDescLangLabel: "Langue de description d'image",
    imageDescLangHint: "Contrôle la langue que Gemini utilise pour les descriptions IA.",
    
    voiceLabel: "Voix préférée",
    voiceAuto: "Auto (par langue)",
    voiceHint: "Si une langue est silencieuse ou avec un accent, essayez une autre voix.",
    
    useElevenLabsLabel: "Utiliser voix cloud (meilleure qualité)",
    elevenLabsKeyLabel: "Clé API ElevenLabs",
    elevenLabsKeyPlaceholder: "sk_...",
    saveKeyButton: "Sauvegarder la clé",
    savedBadge: "sauvegardé",
    elevenLabsVoiceLabel: "Voix cloud (de votre compte)",
    elevenLabsVoicePlaceholder: "Sauvegardez la clé pour charger les voix",
    refreshVoicesButton: "Actualiser les voix",
    elevenLabsHint: "Les voix cloud fonctionnent mieux pour les langues sans bonnes voix locales.",
    refreshUsageButton: "Actualiser l'utilisation",
    usageLabel: (used, limit) => `${used.toLocaleString()} / ${limit.toLocaleString()} caractères utilisés`,
    quotaHint: "Utilise votre quota ElevenLabs, séparé du quota IA ci-dessous.",
    
    geminiUsageTitle: "Utilisation de l'analyse d'images IA",
    geminiUsageText: (used, limit) => `${used} / ${limit} requêtes utilisées dans les dernières 24h.`,
    geminiRateLimited: (seconds) => `Limité temporairement. Nouvelle tentative dans ${seconds}s. Descriptions basiques utilisées.`,
    geminiNoRequests: "Aucune requête d'analyse d'images IA encore.",
    geminiEstimateHint: "Basé sur les requêtes de ce navigateur. La limite gratuite se réinitialise toutes les ~24h.",
    
    speechRateLabel: "Vitesse de parole",
    speechRateHint: "Utilisez Alt+Shift+Up/Down pour ajuster la vitesse sans ouvrir cette fenêtre.",
    
    useAiLabel: "Utiliser l'IA pour analyser images et éléments",
    useAiHint: "Obtenez une clé gratuite sur Google AI Studio pour des descriptions intelligentes.",
    geminiKeyLabel: "Clé API Google Gemini",
    geminiKeyPlaceholder: "AIza...",
    saveGeminiKeyButton: "Sauvegarder la clé API",
    
    announceHoverButton: "Annoncer l'élément survolé",
    announceFocusButton: "Annoncer l'élément focalisé",
    
    helpTitle: "Comment utiliser",
    helpItem1: "Activez l'assistant depuis cette fenêtre.",
    helpItem2: "Survolez les éléments pour entendre des descriptions.",
    helpItem3: "Utilisez Tab pour naviguer et entendre les étiquettes.",
    helpItem4: "Appuyez sur Alt+Shift+Up/Down pour changer la vitesse de parole.",
    helpItem5: "Choisissez une langue pour entendre les descriptions dans cette langue.",
    helpItem6: "Ajoutez une clé Google Gemini pour l'analyse d'images IA.",
    
    loadingState: "Chargement...",
    notAvailableState: "Non disponible sur ce site.",
    statusEnabledMessage: "Assistant activé",
    statusDisabledMessage: "Assistant désactivé",
    
    errorAddKeyFirst: "Ajoutez d'abord une clé API.",
    
    interfaceLangLabel: "Langue de l'interface",
  },
  
  "de-DE": {
    appTitle: "Blindenhelfer",
    appDescription: "Aktivieren Sie den Helfer, um Elementbeschreibungen zu hören.",
    
    statusLabel: "Status",
    statusEnabled: "Aktiv",
    statusDisabled: "Inaktiv",
    
    toggleButton: "Helfer aktivieren",
    toggleButtonDisable: "Helfer deaktivieren",
    
    imageDescLangLabel: "Bildbeschreibungssprache",
    imageDescLangHint: "Steuert die Sprache, die Gemini für KI-Bildbeschreibungen verwendet.",
    
    voiceLabel: "Bevorzugte Stimme",
    voiceAuto: "Auto (nach Sprache)",
    voiceHint: "Wenn eine Sprache stumm oder akzentuiert klingt, probieren Sie eine andere Stimme.",
    
    useElevenLabsLabel: "Cloud-Stimme verwenden (bessere Qualität)",
    elevenLabsKeyLabel: "ElevenLabs API-Schlüssel",
    elevenLabsKeyPlaceholder: "sk_...",
    saveKeyButton: "Schlüssel speichern",
    savedBadge: "gespeichert",
    elevenLabsVoiceLabel: "Cloud-Stimme (aus Ihrem Konto)",
    elevenLabsVoicePlaceholder: "Speichern Sie den Schlüssel zum Laden von Stimmen",
    refreshVoicesButton: "Stimmen aktualisieren",
    elevenLabsHint: "Cloud-Stimmen funktionieren besser für Sprachen ohne gute lokale Stimmen.",
    refreshUsageButton: "Nutzung aktualisieren",
    usageLabel: (used, limit) => `${used.toLocaleString()} / ${limit.toLocaleString()} Zeichen verwendet`,
    quotaHint: "Verwendet Ihr ElevenLabs-Zeichenkontingent, getrennt vom KI-Kontingent unten.",
    
    geminiUsageTitle: "KI-Bildanalyse-Nutzung",
    geminiUsageText: (used, limit) => `${used} / ${limit} Anfragen in den letzten 24 Stunden.`,
    geminiRateLimited: (seconds) => `Vorübergehend begrenzt. Neuer Versuch in ${seconds}s. Grundbeschreibungen werden verwendet.`,
    geminiNoRequests: "Noch keine KI-Bildanalyse-Anfragen.",
    geminiEstimateHint: "Basierend auf Anfragen von diesem Browser. Kostenloses Kontingent wird alle ~24 Stunden zurückgesetzt.",
    
    speechRateLabel: "Sprachgeschwindigkeit",
    speechRateHint: "Verwenden Sie Alt+Shift+Up/Down, um die Geschwindigkeit ohne Öffnen dieses Popups anzupassen.",
    
    useAiLabel: "KI zur Analyse von Bildern und Elementen verwenden",
    useAiHint: "Holen Sie sich einen kostenlosen Schlüssel von Google AI Studio für intelligente Beschreibungen.",
    geminiKeyLabel: "Google Gemini API-Schlüssel",
    geminiKeyPlaceholder: "AIza...",
    saveGeminiKeyButton: "API-Schlüssel speichern",
    
    announceHoverButton: "Element unter Mauszeiger ankündigen",
    announceFocusButton: "Fokussiertes Element ankündigen",
    
    helpTitle: "Verwendung",
    helpItem1: "Aktivieren Sie den Helfer aus diesem Popup.",
    helpItem2: "Bewegen Sie die Maus über Elemente, um Beschreibungen zu hören.",
    helpItem3: "Verwenden Sie Tab zur Navigation und zum Hören von Beschriftungen.",
    helpItem4: "Drücken Sie Alt+Shift+Up/Down, um die Sprachgeschwindigkeit zu ändern.",
    helpItem5: "Wählen Sie eine Sprache, um Beschreibungen in dieser Sprache zu hören.",
    helpItem6: "Fügen Sie einen Google Gemini-Schlüssel für KI-Bildanalyse hinzu.",
    
    loadingState: "Laden...",
    notAvailableState: "Auf dieser Seite nicht verfügbar.",
    statusEnabledMessage: "Helfer aktiv",
    statusDisabledMessage: "Helfer inaktiv",
    
    errorAddKeyFirst: "Fügen Sie zuerst einen API-Schlüssel hinzu.",
    
    interfaceLangLabel: "Oberflächensprache",
  },
  
  "tr-TR": {
    appTitle: "Görme Engelliler Yardımcısı",
    appDescription: "Element açıklamalarını duymak için yardımcıyı açın.",
    
    statusLabel: "Durum",
    statusEnabled: "Açık",
    statusDisabled: "Kapalı",
    
    toggleButton: "Yardımcıyı aç",
    toggleButtonDisable: "Yardımcıyı kapat",
    
    imageDescLangLabel: "Görsel açıklama dili",
    imageDescLangHint: "Gemini'nin AI görsel açıklamaları için kullandığı dili kontrol eder.",
    
    voiceLabel: "Tercih edilen ses",
    voiceAuto: "Otomatik (dile göre)",
    voiceHint: "Bir dil sessiz veya aksanlı geliyorsa, farklı bir ses deneyin.",
    
    useElevenLabsLabel: "Bulut sesi kullan (daha iyi kalite)",
    elevenLabsKeyLabel: "ElevenLabs API anahtarı",
    elevenLabsKeyPlaceholder: "sk_...",
    saveKeyButton: "Anahtarı kaydet",
    savedBadge: "kaydedildi",
    elevenLabsVoiceLabel: "Bulut sesi (hesabınızdan)",
    elevenLabsVoicePlaceholder: "Sesleri yüklemek için anahtarı kaydedin",
    refreshVoicesButton: "Sesleri yenile",
    elevenLabsHint: "Bulut sesleri, iyi yerel sesi olmayan diller için daha iyi çalışır.",
    refreshUsageButton: "Kullanımı yenile",
    usageLabel: (used, limit) => `${used.toLocaleString()} / ${limit.toLocaleString()} karakter kullanıldı`,
    quotaHint: "ElevenLabs karakter kotanızı kullanır, alttaki AI kotasından ayrıdır.",
    
    geminiUsageTitle: "AI görsel analizi kullanımı",
    geminiUsageText: (used, limit) => `Son 24 saatte ${used} / ${limit} istek kullanıldı.`,
    geminiRateLimited: (seconds) => `Geçici olarak sınırlı. ${seconds}s içinde tekrar denenecek. Temel açıklamalar kullanılıyor.`,
    geminiNoRequests: "Henüz AI görsel analizi isteği yok.",
    geminiEstimateHint: "Bu tarayıcıdan gelen isteklere dayanıyor. Ücretsiz sınır her ~24 saatte sıfırlanır.",
    
    speechRateLabel: "Konuşma hızı",
    speechRateHint: "Hızı ayarlamak için Alt+Shift+Up/Down kullanın, bu pencereyi açmadan.",
    
    useAiLabel: "Görselleri ve öğeleri analiz etmek için AI kullan",
    useAiHint: "Akıllı görsel açıklamaları için Google AI Studio'dan ücretsiz anahtar alın.",
    geminiKeyLabel: "Google Gemini API anahtarı",
    geminiKeyPlaceholder: "AIza...",
    saveGeminiKeyButton: "API anahtarını kaydet",
    
    announceHoverButton: "Üzerinde durulan öğeyi duyur",
    announceFocusButton: "Odaklanılan öğeyi duyur",
    
    helpTitle: "Nasıl kullanılır",
    helpItem1: "Yardımcıyı bu pencereden açın.",
    helpItem2: "Açıklamaları duymak için öğelerin üzerinde gezin.",
    helpItem3: "Gezinmek ve etiketleri duymak için Tab kullanın.",
    helpItem4: "Konuşma hızını değiştirmek için Alt+Shift+Up/Down basın.",
    helpItem5: "Açıklamaları bu dilde duymak için bir dil seçin.",
    helpItem6: "AI görsel analizi için Google Gemini anahtarı ekleyin.",
    
    loadingState: "Yükleniyor...",
    notAvailableState: "Bu sitede kullanılamaz.",
    statusEnabledMessage: "Yardımcı açık",
    statusDisabledMessage: "Yardımcı kapalı",
    
    errorAddKeyFirst: "Önce bir API anahtarı ekleyin.",
    
    interfaceLangLabel: "Arayüz dili",
  },
  
  "ar-SA": {
    appTitle: "مساعد للمكفوفين",
    appDescription: "قم بتشغيل المساعد لسماع أوصاف العناصر.",
    
    statusLabel: "الحالة",
    statusEnabled: "مفعل",
    statusDisabled: "معطل",
    
    toggleButton: "تفعيل المساعد",
    toggleButtonDisable: "تعطيل المساعد",
    
    imageDescLangLabel: "لغة وصف الصور",
    imageDescLangHint: "يتحكم في اللغة التي يستخدمها Gemini لأوصاف الصور بالذكاء الاصطناعي.",
    
    voiceLabel: "الصوت المفضل",
    voiceAuto: "تلقائي (حسب اللغة)",
    voiceHint: "إذا كانت اللغة صامتة أو لها لكنة، جرب صوتاً مختلفاً.",
    
    useElevenLabsLabel: "استخدام صوت سحابي (جودة أفضل)",
    elevenLabsKeyLabel: "مفتاح API لـ ElevenLabs",
    elevenLabsKeyPlaceholder: "sk_...",
    saveKeyButton: "حفظ المفتاح",
    savedBadge: "محفوظ",
    elevenLabsVoiceLabel: "صوت سحابي (من حسابك)",
    elevenLabsVoicePlaceholder: "احفظ المفتاح لتحميل الأصوات",
    refreshVoicesButton: "تحديث الأصوات",
    elevenLabsHint: "الأصوات السحابية تعمل بشكل أفضل للغات التي لا تحتوي على أصوات محلية جيدة.",
    refreshUsageButton: "تحديث الاستخدام",
    usageLabel: (used, limit) => `${used.toLocaleString()} / ${limit.toLocaleString()} حرف مستخدم`,
    quotaHint: "يستخدم حصتك من ElevenLabs، منفصل عن حصة الذكاء الاصطناعي أدناه.",
    
    geminiUsageTitle: "استخدام تحليل الصور بالذكاء الاصطناعي",
    geminiUsageText: (used, limit) => `${used} / ${limit} طلب مستخدم في آخر 24 ساعة.`,
    geminiRateLimited: (seconds) => `محدود مؤقتاً. إعادة المحاولة خلال ${seconds} ثانية. استخدام الأوصاف الأساسية.`,
    geminiNoRequests: "لا توجد طلبات تحليل صور بالذكاء الاصطناعي بعد.",
    geminiEstimateHint: "بناءً على الطلبات من هذا المتصفح. يتم إعادة تعيين الحد المجاني كل ~24 ساعة.",
    
    speechRateLabel: "سرعة الكلام",
    speechRateHint: "استخدم Alt+Shift+Up/Down لضبط السرعة دون فتح هذه النافذة.",
    
    useAiLabel: "استخدام الذكاء الاصطناعي لتحليل الصور والعناصر",
    useAiHint: "احصل على مفتاح مجاني من Google AI Studio لأوصاف ذكية.",
    geminiKeyLabel: "مفتاح Google Gemini API",
    geminiKeyPlaceholder: "AIza...",
    saveGeminiKeyButton: "حفظ مفتاح API",
    
    announceHoverButton: "إعلان العنصر المحدد بالفأرة",
    announceFocusButton: "إعلان العنصر المركز",
    
    helpTitle: "كيفية الاستخدام",
    helpItem1: "قم بتشغيل المساعد من هذه النافذة.",
    helpItem2: "مرر الفأرة فوق العناصر لسماع الأوصاف.",
    helpItem3: "استخدم Tab للتنقل والاستماع إلى التسميات.",
    helpItem4: "اضغط على Alt+Shift+Up/Down لتغيير سرعة الكلام.",
    helpItem5: "اختر لغة لسماع الأوصاف بتلك اللغة.",
    helpItem6: "أضف مفتاح Google Gemini لتحليل الصور بالذكاء الاصطناعي.",
    
    loadingState: "جاري التحميل...",
    notAvailableState: "غير متاح في هذا الموقع.",
    statusEnabledMessage: "المساعد مفعل",
    statusDisabledMessage: "المساعد معطل",
    
    errorAddKeyFirst: "أضف مفتاح API أولاً.",
    
    interfaceLangLabel: "لغة الواجهة",
  },
  
  "zh-CN": {
    appTitle: "盲人助手",
    appDescription: "开启助手以听取元素描述。",
    
    statusLabel: "状态",
    statusEnabled: "已开启",
    statusDisabled: "已关闭",
    
    toggleButton: "开启助手",
    toggleButtonDisable: "关闭助手",
    
    imageDescLangLabel: "图像描述语言",
    imageDescLangHint: "控制Gemini用于AI图像描述的语言。",
    
    voiceLabel: "首选语音",
    voiceAuto: "自动（按语言）",
    voiceHint: "如果某种语言听起来静音或有口音，请尝试其他语音。",
    
    useElevenLabsLabel: "使用云端语音（质量更好）",
    elevenLabsKeyLabel: "ElevenLabs API密钥",
    elevenLabsKeyPlaceholder: "sk_...",
    saveKeyButton: "保存密钥",
    savedBadge: "已保存",
    elevenLabsVoiceLabel: "云端语音（来自您的账户）",
    elevenLabsVoicePlaceholder: "保存密钥以加载语音",
    refreshVoicesButton: "刷新语音",
    elevenLabsHint: "云端语音在缺乏良好本地语音的语言中效果更好。",
    refreshUsageButton: "刷新使用情况",
    usageLabel: (used, limit) => `已使用 ${used.toLocaleString()} / ${limit.toLocaleString()} 个字符`,
    quotaHint: "使用您的ElevenLabs字符配额，与下方的AI配额分开。",
    
    geminiUsageTitle: "AI图像分析使用情况",
    geminiUsageText: (used, limit) => `过去24小时使用了 ${used} / ${limit} 个请求。`,
    geminiRateLimited: (seconds) => `暂时受限。${seconds}秒后重试。正在使用基本描述。`,
    geminiNoRequests: "尚无AI图像分析请求。",
    geminiEstimateHint: "基于此浏览器的请求。免费额度每~24小时重置一次。",
    
    speechRateLabel: "语速",
    speechRateHint: "使用Alt+Shift+Up/Down调整速度，无需打开此弹出窗口。",
    
    useAiLabel: "使用AI分析图像和元素",
    useAiHint: "从Google AI Studio获取免费密钥以启用智能图像描述。",
    geminiKeyLabel: "Google Gemini API密钥",
    geminiKeyPlaceholder: "AIza...",
    saveGeminiKeyButton: "保存API密钥",
    
    announceHoverButton: "播报悬停元素",
    announceFocusButton: "播报焦点元素",
    
    helpTitle: "使用方法",
    helpItem1: "从此弹出窗口开启助手。",
    helpItem2: "将鼠标悬停在元素上以听取描述。",
    helpItem3: "使用Tab键导航并听取标签。",
    helpItem4: "按Alt+Shift+Up/Down更改语速。",
    helpItem5: "选择一种语言以该语言听取描述。",
    helpItem6: "添加Google Gemini密钥以进行AI图像分析。",
    
    loadingState: "加载中...",
    notAvailableState: "此网站不可用。",
    statusEnabledMessage: "助手已开启",
    statusDisabledMessage: "助手已关闭",
    
    errorAddKeyFirst: "请先添加API密钥。",
    
    interfaceLangLabel: "界面语言",
  },
  
  "ja-JP": {
    appTitle: "盲人支援アシスタント",
    appDescription: "アシスタントをオンにして要素の説明を聞きます。",
    
    statusLabel: "ステータス",
    statusEnabled: "オン",
    statusDisabled: "オフ",
    
    toggleButton: "アシスタントをオンにする",
    toggleButtonDisable: "アシスタントをオフにする",
    
    imageDescLangLabel: "画像説明言語",
    imageDescLangHint: "GeminiがAI画像説明に使用する言語を制御します。",
    
    voiceLabel: "優先音声",
    voiceAuto: "自動（言語別）",
    voiceHint: "言語が無音またはアクセント付きで聞こえる場合は、別の音声を試してください。",
    
    useElevenLabsLabel: "クラウド音声を使用（品質が良い）",
    elevenLabsKeyLabel: "ElevenLabs APIキー",
    elevenLabsKeyPlaceholder: "sk_...",
    saveKeyButton: "キーを保存",
    savedBadge: "保存済み",
    elevenLabsVoiceLabel: "クラウド音声（アカウントから）",
    elevenLabsVoicePlaceholder: "音声を読み込むにはキーを保存",
    refreshVoicesButton: "音声を更新",
    elevenLabsHint: "クラウド音声は、良好なローカル音声のない言語でより良く機能します。",
    refreshUsageButton: "使用状況を更新",
    usageLabel: (used, limit) => `${used.toLocaleString()} / ${limit.toLocaleString()} 文字使用`,
    quotaHint: "ElevenLabs文字クォータを使用、下のAIクォータとは別です。",
    
    geminiUsageTitle: "AI画像分析の使用状況",
    geminiUsageText: (used, limit) => `過去24時間で${used} / ${limit}リクエスト使用。`,
    geminiRateLimited: (seconds) => `一時的に制限されています。${seconds}秒後に再試行。基本説明を使用中。`,
    geminiNoRequests: "AI画像分析リクエストはまだありません。",
    geminiEstimateHint: "このブラウザからのリクエストに基づく。無料枠は約24時間ごとにリセット。",
    
    speechRateLabel: "読み上げ速度",
    speechRateHint: "Alt+Shift+Up/Downで速度を調整（このウィンドウを開かなくても）。",
    
    useAiLabel: "AIを使用して画像と要素を分析",
    useAiHint: "Google AI Studioから無料キーを取得してスマートな画像説明を有効にします。",
    geminiKeyLabel: "Google Gemini APIキー",
    geminiKeyPlaceholder: "AIza...",
    saveGeminiKeyButton: "APIキーを保存",
    
    announceHoverButton: "ホバー要素を読み上げ",
    announceFocusButton: "フォーカス要素を読み上げ",
    
    helpTitle: "使い方",
    helpItem1: "このウィンドウからアシスタントをオンにします。",
    helpItem2: "要素にホバーして説明を聞きます。",
    helpItem3: "Tabキーでナビゲーションし、ラベルを聞きます。",
    helpItem4: "Alt+Shift+Up/Downで読み上げ速度を変更します。",
    helpItem5: "言語を選択して、その言語で説明を聞きます。",
    helpItem6: "AI画像分析用にGoogle Geminiキーを追加します。",
    
    loadingState: "読み込み中...",
    notAvailableState: "このサイトでは利用できません。",
    statusEnabledMessage: "アシスタントオン",
    statusDisabledMessage: "アシスタントオフ",
    
    errorAddKeyFirst: "まずAPIキーを追加してください。",
    
    interfaceLangLabel: "インターフェース言語",
  },
};

export type LanguageCode = keyof typeof translations;