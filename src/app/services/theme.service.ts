import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { defaultMempoolFeeColors } from '@app/app.constants';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  theme: string = 'default';
  themeState$ = new BehaviorSubject<{ theme: string; loading: boolean; }>({ theme: 'default', loading: false });
  mempoolFeeColors: string[] = defaultMempoolFeeColors;

  apply(_theme: string): void {
    // single-theme build: alternate themes were removed in ltcspace
  }
}
