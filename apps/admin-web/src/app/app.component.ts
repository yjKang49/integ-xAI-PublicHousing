import { Component, inject, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthService } from './core/auth/auth.service';

@Component({
  selector: 'ax-root',
  standalone: true,
  imports: [RouterOutlet],
  template: `<router-outlet />`,
})
export class AppComponent implements OnInit {
  private readonly authService = inject(AuthService);

  ngOnInit() {
    // Restore session from localStorage so guards work after page refresh.
    this.authService.restoreSession();
  }
}
