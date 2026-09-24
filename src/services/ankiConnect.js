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
    console.error(`Erro ao invocar ${action} no AnkiConnect:`, error);
    throw error;
  }
};

export const ankiService = {
  getDeckNames: () => invokeAnki('deckNames'),
  getDeckStats: (deckName) => invokeAnki('getDeckStats', { decks: [deckName] }),
  getCardsToReview: (deckName) => invokeAnki('findCards', { query: `deck:"${deckName}" is:due` }),
  getCardsInfo: (cardIds) => invokeAnki('cardsInfo', { cards: cardIds }),
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
