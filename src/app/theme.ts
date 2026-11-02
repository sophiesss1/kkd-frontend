import type { ThemeConfig } from 'antd';

/**
 * Тема корпоративного UI-кита (UI-KIT.md, раздел 1) — скопирована без изменений.
 * Ниже блока из кита добавлены только семантические фоны/тексты из раздела 2 (палитра),
 * чтобы компоненты брали их из темы, а не хардкодили hex.
 */
export const theme: ThemeConfig = {
  cssVar: { key: 'kkd' },
  hashed: false,
  token: {
    // акцент и семантика
    colorPrimary: '#056cfd',
    colorInfo: '#056cfd',
    colorSuccess: '#039306',
    colorWarning: '#faad14',
    colorError: '#d43629',
    colorLink: '#1b4de3',
    // текст
    colorText: '#312921',
    colorTextSecondary: '#76726C',
    colorTextTertiary: '#9d9b99',
    // фоны и границы (тёплая, а не серая основа)
    colorBgContainer: '#fefcfa',
    colorBgElevated: '#fefcfa',
    colorBgLayout: '#f7f3f0',
    colorFill: '#eae4de',
    colorBorder: '#EAE7E5',
    colorBorderSecondary: '#e8e5e2',
    // типографика
    fontFamily: '"Inter", sans-serif',
    fontSize: 14,
    lineHeight: 1.5714,
    fontWeightStrong: 600,
    fontSizeHeading1: 38,
    fontSizeHeading2: 30,
    fontSizeHeading3: 24,
    fontSizeHeading4: 20,
    fontSizeHeading5: 16,
    // геометрия
    borderRadius: 6,
    borderRadiusSM: 4,
    borderRadiusLG: 8,
    controlHeight: 32,
    controlHeightSM: 24,
    controlHeightLG: 40,

    // --- палитра из раздела 2 кита ---
    colorPrimaryHover: '#1b4de3',
    colorPrimaryActive: '#0f2cc4',
    colorPrimaryBg: '#ddeafd',
    colorSuccessBg: '#e3edd8',
    colorSuccessText: '#007802',
    colorWarningBg: '#fffbe6',
    colorWarningText: '#ca820e',
    colorErrorBg: '#fce3d9',
    colorErrorText: '#b81301',
    colorInfoBg: '#d5edfa',
    colorInfoText: '#036c8f',
  },
  components: {
    Button: {
      paddingInline: 12,
      defaultColor: '#322c26',
      defaultBorderColor: '#eae4de',
      defaultHoverColor: '#1b4de3',
      defaultHoverBorderColor: '#1b4de3',
    },
    Layout: { bodyBg: '#fefcfa', siderBg: '#f7f3f0', headerHeight: 72, headerPadding: 0 },
    Menu: {
      itemBg: '#f7f3f0', itemColor: '#322c26', itemHeight: 32,
      itemHoverBg: '#eae4de', itemSelectedBg: '#d9e3f8', itemSelectedColor: '#1b4de3',
    },
    Table: { headerBg: '#fefcfa' },
    Select: { optionSelectedBg: '#ddeafd', optionSelectedColor: '#1b4de3' },
    // радиус модалки 28px — раздел 4 кита
    Modal: { titleFontSize: 20, colorBgMask: 'rgba(50, 44, 38, 0.07)', borderRadiusLG: 28 },
    Tag: { defaultBg: '#f7f3f0' },
    Tooltip: { colorText: '#e4e6e2', colorBgBase: '#90928d' },
    Divider: { colorSplit: '#eae4de' },
  },
};
