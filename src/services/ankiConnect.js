const ANKI_URL = 'http://127.0.0.1:8765';

export const invokeAnki = async (action, params = {}) => {
  try {
    const response = await fetch(ANKI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, version: 6, params }),
    });
    if (!response.ok) throw new Error(`Erro HTTP: ${response.status}`);
    const data = await response.json();
    if (Object.prototype.hasOwnProperty.call(data, 'error') && data.error) {
      throw new Error(data.error);
    }
    return data.result;
  } catch (error) {
    throw error;
  }
};

export const ankiService = {
  getDeckNames: () => invokeAnki('deckNames'),
  getTags: () => invokeAnki('getTags'),
  getCardsToReview: (query) => invokeAnki('findCards', { query: `${query} is:due` }),
  findCards: (query) => invokeAnki('findCards', { query }),
  getCardsInfoChunked: async (cardIds) => {
    const chunkSize = 500;
    let allInfo = [];
    for (let i = 0; i < cardIds.length; i += chunkSize) {
      const chunk = cardIds.slice(i, i + chunkSize);
      const info = await invokeAnki('cardsInfo', { cards: chunk });
      allInfo = allInfo.concat(info);
    }
    return allInfo;
  },
  getReviewsOfCardsChunked: async (cardIds) => {
    const chunkSize = 500;
    let allReviews = {};
    for (let i = 0; i < cardIds.length; i += chunkSize) {
      const chunk = cardIds.slice(i, i + chunkSize);
      const reviewsInfo = await invokeAnki('getReviewsOfCards', { cards: chunk });
      allReviews = { ...allReviews, ...reviewsInfo };
    }
    return allReviews;
  },
  getReviewActivity: () => invokeAnki('getNumCardsReviewedByDay'),
  checkConnection: async () => {
    try {
      await invokeAnki('version');
      return true;
    } catch {
      return false;
    }
  }
};
