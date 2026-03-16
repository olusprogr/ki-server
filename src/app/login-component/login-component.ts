import { Component  } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../api-service';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-login-component',
  imports: [
    CommonModule,
    FormsModule
  ],
  templateUrl: './login-component.html',
  styleUrl: './login-component.css',
})
export class LoginComponent {
  inputUsername: string = '';
  inputPassword: string = '';

  backEndResponse: string | null = null;

  bypassLogin: boolean = environment.bypassLogin || false;

  constructor(
    private router: Router,
    private apiService: ApiService
  ) {
    if (this.bypassLogin) {
      this.router.navigate(['/dashboard']);
      return;
    }

    const authToken = localStorage.getItem('authToken');

    if (authToken) {
      this.loginWithToken();
    }
  }

  public loginWithToken(): void {
    this.apiService.loginWithToken().subscribe({
      next: (response) => {
        if (response.pass) {
          this.router.navigate(['/dashboard']);
        } else {
          localStorage.removeItem('authToken');
        }
      },
      error: () => {
        localStorage.removeItem('authToken');
      }
    });
  }

  public onSubmit(): void {
    if (this.inputUsername === '' || this.inputPassword === '') {
      alert("Bitte geben Sie einen Benutzernamen und ein Passwort ein.");
      return;
    }

    if (this.inputUsername.length < 4 || this.inputPassword.length < 5) {
      alert("Benutzername und Passwort müssen mindestens 4 bzw. 5 Zeichen lang sein.");
      return;
    }

    const credentials = { username: this.inputUsername, password: this.inputPassword };

    this.apiService.logIn(credentials).subscribe({
      next: (response) => {
        if (response.token) {
          localStorage.setItem('authToken', response.token);
          this.router.navigate(['/dashboard']);
        } else {
          alert("Ungültiger Benutzername oder Passwort.");
        }
      },
      error: (error) => {
        alert("Ungültiger Benutzername oder Passwort.");
      }
    });
  }
}
