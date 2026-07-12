import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { AbstractControl, FormControl, FormGroup, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthStore } from '../../../core/auth/auth.store';

interface RegisterForm {
  fullName: FormControl<string>;
  username: FormControl<string>;
  email: FormControl<string>;
  phone: FormControl<string>;
  password: FormControl<string>;
  confirmPassword: FormControl<string>;
  terms: FormControl<boolean>;
}

@Component({
  selector: 'app-register-page',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './register.page.html',
  styleUrl: './register.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegisterPage {
  private readonly auth = inject(AuthStore);
  protected readonly loading = signal(false);
  protected readonly message = signal('');
  protected readonly isError = signal(false);
  protected readonly showPassword = signal(false);
  protected readonly showConfirmPassword = signal(false);

  protected readonly form = new FormGroup<RegisterForm>({
    fullName: new FormControl('', { nonNullable: true }),
    username: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
    phone: new FormControl('', { nonNullable: true }),
    password: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(/^(?=.*[A-Za-z])(?=.*\d).{8,}$/)],
    }),
    confirmPassword: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    terms: new FormControl(false, { nonNullable: true, validators: [Validators.requiredTrue] }),
  }, { validators: passwordMatchValidator });

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { email, username, password, fullName, phone } = this.form.getRawValue();
    this.loading.set(true);
    this.message.set('');

    this.auth.register({
      email,
      username,
      password,
      fullName: fullName || undefined,
      phone: phone || undefined,
    }).subscribe({
      next: () => {
        this.isError.set(false);
        this.message.set('Đăng ký thành công. Hãy xác minh email trước khi đăng nhập.');
        this.loading.set(false);
      },
      error: () => {
        this.isError.set(true);
        this.message.set('Đăng ký thất bại. Kiểm tra dữ liệu hoặc email đã tồn tại.');
        this.loading.set(false);
      },
    });
  }

  protected hasError(controlName: keyof RegisterForm, error: string): boolean {
    const control = this.form.controls[controlName];
    return control.hasError(error) && (control.dirty || control.touched);
  }

  protected passwordMismatch(): boolean {
    const confirmPassword = this.form.controls.confirmPassword;
    return this.form.hasError('passwordMismatch') && (confirmPassword.dirty || confirmPassword.touched);
  }

  protected togglePassword(): void {
    this.showPassword.update((value) => !value);
  }

  protected toggleConfirmPassword(): void {
    this.showConfirmPassword.update((value) => !value);
  }
}

function passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
  const password = control.get('password')?.value;
  const confirmPassword = control.get('confirmPassword')?.value;
  return password && confirmPassword && password !== confirmPassword ? { passwordMismatch: true } : null;
}
