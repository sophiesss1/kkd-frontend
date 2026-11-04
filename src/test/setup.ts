import '@testing-library/jest-dom/vitest';

// в jsdom нет matchMedia, а antd подписывается на медиазапросы (адаптивные Select, Table)
window.matchMedia = (query: string) =>
  ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }) as MediaQueryList;

// jsdom не умеет стили псевдоэлементов, о которых спрашивает antd, и пишет об этом ошибку в консоль
const getComputedStyle = window.getComputedStyle.bind(window);
window.getComputedStyle = (elt: Element) => getComputedStyle(elt);
