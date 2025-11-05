import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { environment } from '../../env';
import { Router } from '@angular/router';

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



  constructor(
    private router: Router
  ) {

  }

  onSubmit() {
    console.log('Username:', this.inputUsername);
    console.log('Password:', this.inputPassword);

    console.log('Username from environment:', this.username);

    console.log(typeof this.inputUsername);

    if (this.inputUsername === '' || this.inputPassword === '') {
      alert("Bitte geben Sie einen Benutzernamen und ein Passwort ein.");
      return;
    }

    if (this.inputUsername.length < 5 || this.inputPassword.length < 5) {
      alert("Benutzername und Passwort müssen mindestens 5 Zeichen lang sein.");
      return;
    }

    if (this.inputUsername === "test1" && this.inputPassword === "test1") {
      alert("Login erfolgreich!");
      this.router.navigate(['/dashboard']);
    } else {
      alert("Ungültiger Benutzername oder Passwort.");
    }
  }
}
