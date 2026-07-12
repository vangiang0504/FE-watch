export interface GoogleCredentialResponse {
  credential: string;
  select_by?: string;
}

export interface GoogleAccountsId {
  initialize(config: {
    client_id: string;
    callback: (response: GoogleCredentialResponse) => void;
    auto_select?: boolean;
    cancel_on_tap_outside?: boolean;
  }): void;
  renderButton(parent: HTMLElement, options: {
    theme?: 'outline' | 'filled_blue' | 'filled_black';
    size?: 'large' | 'medium' | 'small';
    type?: 'standard' | 'icon';
    shape?: 'rectangular' | 'pill' | 'circle' | 'square';
    text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
    logo_alignment?: 'left' | 'center';
    width?: number;
  }): void;
  prompt(): void;
}

export interface GoogleIdentityServices {
  accounts: {
    id: GoogleAccountsId;
  };
}

declare global {
  interface Window {
    google?: GoogleIdentityServices;
  }
}
