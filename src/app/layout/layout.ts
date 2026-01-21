import { Component, HostListener } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Navbar } from '../navbar/navbar';
import { NgIf } from '@angular/common';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [RouterOutlet, Navbar, NgIf],
  templateUrl: './layout.html'
})
export class LayoutComponent {
  isMobile = false;
  menuOpen = true;

  ngOnInit() {
    this.checkScreen();
  }

  @HostListener('window:resize')
  public checkScreen() {
    this.isMobile = window.innerWidth < 768;
    this.menuOpen = !this.isMobile;
  }

  public toggleMenu() {
    this.menuOpen = !this.menuOpen;
  }

  public closeMenu() {
    if (this.isMobile) {
      this.menuOpen = false;
    }
  }
}