import { Component, Input } from '@angular/core';

export type BallKind = 'baseball' | 'basketball' | 'football' | 'soccer' | 'puck' | 'tyre';

/**
 * The sport balls, drawn as SVG.
 *
 * Deliberately not emoji: emoji render differently on every platform, cannot be
 * coloured to the palette, and look like clip-art at large sizes. These are
 * simple enough to stay legible at 24px and hold up at 120px.
 *
 * `currentColor` throughout so a ball inherits whatever it sits on.
 */
@Component({
  selector: 'app-sport-ball',
  template: `
    <svg [attr.width]="size" [attr.height]="size" viewBox="0 0 100 100"
         fill="none" aria-hidden="true" [class]="kind">

      <ng-container [ngSwitch]="kind">

        <!-- Baseball: circle with the two opposing seams. -->
        <g *ngSwitchCase="'baseball'">
          <circle cx="50" cy="50" r="44" [attr.fill]="fill" [attr.stroke]="stroke" stroke-width="4"/>
          <path d="M22 18 Q38 50 22 82" [attr.stroke]="seam" stroke-width="3.5" stroke-linecap="round"/>
          <path d="M78 18 Q62 50 78 82" [attr.stroke]="seam" stroke-width="3.5" stroke-linecap="round"/>
        </g>

        <!-- Basketball: circle, vertical and horizontal lines, two arcs. -->
        <g *ngSwitchCase="'basketball'">
          <circle cx="50" cy="50" r="44" [attr.fill]="fill" [attr.stroke]="stroke" stroke-width="4"/>
          <path d="M50 6 V94" [attr.stroke]="seam" stroke-width="3.5"/>
          <path d="M6 50 H94" [attr.stroke]="seam" stroke-width="3.5"/>
          <path d="M18 18 Q50 50 18 82" [attr.stroke]="seam" stroke-width="3.5" fill="none"/>
          <path d="M82 18 Q50 50 82 82" [attr.stroke]="seam" stroke-width="3.5" fill="none"/>
        </g>

        <!-- Football: prolate spheroid with laces. -->
        <g *ngSwitchCase="'football'">
          <ellipse cx="50" cy="50" rx="46" ry="30" [attr.fill]="fill" [attr.stroke]="stroke" stroke-width="4"/>
          <path d="M28 50 H72" [attr.stroke]="seam" stroke-width="3.5" stroke-linecap="round"/>
          <path d="M38 42 V58 M46 40 V60 M54 40 V60 M62 42 V58"
                [attr.stroke]="seam" stroke-width="3" stroke-linecap="round"/>
        </g>

        <!-- Soccer: circle with the centre pentagon and its spokes. -->
        <g *ngSwitchCase="'soccer'">
          <circle cx="50" cy="50" r="44" [attr.fill]="fill" [attr.stroke]="stroke" stroke-width="4"/>
          <path d="M50 28 L68 41 L61 62 L39 62 L32 41 Z" [attr.fill]="seam"/>
          <path d="M50 28 V10 M68 41 L86 33 M61 62 L72 79 M39 62 L28 79 M32 41 L14 33"
                [attr.stroke]="seam" stroke-width="3.5" stroke-linecap="round"/>
        </g>

        <!-- Hockey puck, seen at a slight angle. -->
        <g *ngSwitchCase="'puck'">
          <ellipse cx="50" cy="62" rx="40" ry="16" [attr.fill]="stroke"/>
          <rect x="10" y="38" width="80" height="24" [attr.fill]="stroke"/>
          <ellipse cx="50" cy="38" rx="40" ry="16" [attr.fill]="fill" [attr.stroke]="stroke" stroke-width="3"/>
          <ellipse cx="50" cy="38" rx="26" ry="10" [attr.stroke]="seam" stroke-width="2.5" fill="none"/>
        </g>

        <!-- Racing tyre. -->
        <g *ngSwitchCase="'tyre'">
          <circle cx="50" cy="50" r="44" [attr.fill]="stroke"/>
          <circle cx="50" cy="50" r="26" [attr.fill]="fill" [attr.stroke]="seam" stroke-width="3"/>
          <circle cx="50" cy="50" r="10" [attr.fill]="seam"/>
          <path d="M50 6 V18 M50 82 V94 M6 50 H18 M82 50 H94"
                [attr.stroke]="fill" stroke-width="4" stroke-linecap="round"/>
        </g>

      </ng-container>
    </svg>
  `,
  styles: [`
    :host { display: inline-flex; line-height: 0; }
    svg { display: block; }
  `],
})
export class SportBallComponent {
  @Input() kind: BallKind = 'baseball';
  @Input() size = 40;
  @Input() fill = '#f5a524';
  @Input() stroke = '#0b1220';
  @Input() seam = '#0b1220';
}
