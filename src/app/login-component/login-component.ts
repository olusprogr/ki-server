import { Component  } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { environment } from '../../env';
import { Router } from '@angular/router';
import { ApiService } from '../api-service';

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

  username: string = environment.API_KEY;
  backEndResponse: string | null = null;

  constructor(
    private router: Router,
    private apiService: ApiService
  ) {
    this.apiService.testConnection().subscribe({
      next: (response) => {
        console.log('API-Verbindung erfolgreich');
        console.log(response);
        this.backEndResponse = JSON.stringify(response);
      },
      error: (error) => {
        console.error('API-Verbindung fehlgeschlagen:', error);
      }
    });
  }

  public onSubmit(): void {
    if (this.inputUsername === '' || this.inputPassword === '') {
      alert("Bitte geben Sie einen Benutzernamen und ein Passwort ein.");
      return;
    }

    if (this.inputUsername.length < 5 || this.inputPassword.length < 5) {
      alert("Benutzername und Passwort müssen mindestens 5 Zeichen lang sein.");
      return;
    }

    const credentials = { username: this.inputUsername, password: this.inputPassword };

    this.apiService.logIn(credentials).subscribe({
      next: (response) => {
        localStorage.setItem('authToken', response.token);
        this.router.navigate(['/dashboard']);
      },
      error: (error) => {
        alert("Ungültiger Benutzername oder Passwort.");
      }
    });
  }
}
