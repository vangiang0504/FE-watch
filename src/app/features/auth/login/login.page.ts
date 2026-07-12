import { AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, inject, signal, ViewChild } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthStore } from '../../../core/auth/auth.store';
import { googleConfig } from '../../../core/config/google.config';
import { GoogleCredentialResponse } from '../../../shared/models/google-identity.model';

interface LoginForm {
  email: FormControl<string>;
  password: FormControl<string>;
  remember: FormControl<boolean>;
}

@Component({
  selector: 'app-login-page',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './login.page.html',
  styleUrl: './login.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginPage implements AfterViewInit {
  @ViewChild('googleButton') private googleButton?: ElementRef<HTMLElement>;

  private readonly auth = inject(AuthStore);
  private readonly router = inject(Router);
  protected readonly loading = signal(false);
  protected readonly googleLoading = signal(false);
  protected readonly message = signal('');
  protected readonly isError = signal(false);
  protected readonly showPassword = signal(false);

  protected readonly form = new FormGroup<LoginForm>({
    email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
    password: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    remember: new FormControl(false, { nonNullable: true }),
  });

  ngAfterViewInit(): void {
    this.renderGoogleButton();
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.message.set('');
    const { email, password } = this.form.getRawValue();

    this.auth.login(email, password).subscribe({
      next: () => {
        this.isError.set(false);
        this.message.set('Đăng nhập thành công.');
        this.loading.set(false);
        void this.router.navigateByUrl('/home');
      },
      error: () => {
        this.isError.set(true);
        this.message.set('Tên đăng nhập hoặc mật khẩu không đúng.');
        this.loading.set(false);
      },
    });
  }

  protected hasError(controlName: keyof LoginForm, error: string): boolean {
    const control = this.form.controls[controlName];
    return control.hasError(error) && (control.dirty || control.touched);
  }

  protected togglePassword(): void {
    this.showPassword.update((value) => !value);
  }

  private renderGoogleButton(attempt = 0): void {
    if (!googleConfig.clientId) {
      this.isError.set(true);
      this.message.set('Chưa cấu hình Google Client ID.');
      return;
    }

    if (!this.googleButton) {
      return;
    }

    if (!window.google) {
      if (attempt < 20) {
        window.setTimeout(() => this.renderGoogleButton(attempt + 1), 150);
        return;
      }

      this.isError.set(true);
      this.message.set('Google Sign-In chưa sẵn sàng, vui lòng tải lại trang.');
      return;
    }

    window.google.accounts.id.initialize({
      client_id: googleConfig.clientId,
      callback: (response) => this.handleGoogleCredential(response),
      auto_select: false,
      cancel_on_tap_outside: true,
    });

    window.google.accounts.id.renderButton(this.googleButton.nativeElement, {
      theme: 'outline',
      size: 'large',
      type: 'standard',
      shape: 'rectangular',
      text: 'signin_with',
      logo_alignment: 'left',
      width: 320,
    });
  }

  private handleGoogleCredential(response: GoogleCredentialResponse): void {
    this.googleLoading.set(true);
    this.message.set('');

    this.auth.loginWithGoogle(response.credential).subscribe({
      next: () => {
        this.isError.set(false);
        this.message.set('Đăng nhập Google thành công.');
        this.googleLoading.set(false);
        void this.router.navigateByUrl('/home');
      },
      error: () => {
        this.isError.set(true);
        this.message.set('Đăng nhập Google thất bại.');
        this.googleLoading.set(false);
      },
    });
  }
}
