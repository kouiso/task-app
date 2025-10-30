import { type AIProvider, type Conversation, Message } from '@/types/chat';

const STORAGE_KEYS = {
  CONVERSATIONS: 'chathub_conversations',
  PROVIDERS: 'chathub_providers',
  SETTINGS: 'chathub_settings',
};

export class ChatStorage {
  static saveConversation(conversation: Conversation): void {
    const conversations = ChatStorage.getConversations();
    const index = conversations.findIndex((c) => c.id === conversation.id);

    if (index !== -1) {
      conversations[index] = conversation;
    } else {
      conversations.push(conversation);
    }

    localStorage.setItem(STORAGE_KEYS.CONVERSATIONS, JSON.stringify(conversations));
  }

  static getConversations(): Conversation[] {
    const data = localStorage.getItem(STORAGE_KEYS.CONVERSATIONS);
    if (!data) return [];

    try {
      return JSON.parse(data);
    } catch {
      return [];
    }
  }

  static deleteConversation(id: string): void {
    const conversations = ChatStorage.getConversations();
    const filtered = conversations.filter((c) => c.id !== id);
    localStorage.setItem(STORAGE_KEYS.CONVERSATIONS, JSON.stringify(filtered));
  }

  static saveProviders(providers: AIProvider[]): void {
    localStorage.setItem(STORAGE_KEYS.PROVIDERS, JSON.stringify(providers));
  }

  static getProviders(): AIProvider[] | null {
    const data = localStorage.getItem(STORAGE_KEYS.PROVIDERS);
    if (!data) return null;

    try {
      return JSON.parse(data);
    } catch {
      return null;
    }
  }

  static saveSettings(settings: any): void {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  }

  static getSettings(): any | null {
    const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (!data) return null;

    try {
      return JSON.parse(data);
    } catch {
      return null;
    }
  }

  static clearAll(): void {
    Object.values(STORAGE_KEYS).forEach((key) => {
      localStorage.removeItem(key);
    });
  }

  static exportData(): string {
    const data = {
      conversations: ChatStorage.getConversations(),
      providers: ChatStorage.getProviders(),
      settings: ChatStorage.getSettings(),
      exportedAt: new Date().toISOString(),
    };
    return JSON.stringify(data, null, 2);
  }

  static importData(jsonString: string): boolean {
    try {
      const data = JSON.parse(jsonString);

      if (data.conversations) {
        localStorage.setItem(STORAGE_KEYS.CONVERSATIONS, JSON.stringify(data.conversations));
      }
      if (data.providers) {
        localStorage.setItem(STORAGE_KEYS.PROVIDERS, JSON.stringify(data.providers));
      }
      if (data.settings) {
        localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(data.settings));
      }

      return true;
    } catch {
      return false;
    }
  }
}
