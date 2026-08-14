import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnDestroy,
  Output,
  ViewChild,
} from '@angular/core';
import type * as LeafletNS from 'leaflet';

/**
 * Tap a point on the world.
 *
 * Tiles come from OpenStreetMap. That is a real external dependency and the
 * only one on the play path, so the component degrades rather than breaks: if
 * tiles fail to load the map is still interactive and a guess still scores,
 * because scoring is a great-circle distance computed on the server and does
 * not care whether anything was drawn.
 *
 * OSM's tile policy is aimed at modest use. If this ever gets real traffic the
 * tile source is the thing to move to a paid provider, and it is deliberately
 * the only line here that would need changing.
 */
@Component({
  selector: 'app-map-picker',
  template: `
    <div class="map-wrap">
      <div #canvas class="map" role="application"
           aria-label="Tap the map to place your guess"></div>
      <p class="hint bad" *ngIf="failed">
        The map could not load. Your answer still scores — the distance is
        measured on the server — but you will have to guess blind.
      </p>
      <p class="hint" *ngIf="!guess && !failed">Tap anywhere to place your guess.</p>
      <p class="hint placed" *ngIf="guess && !revealed">
        Guess placed. Tap again to move it.
      </p>
      <!-- The place matters as much as the name. "Ebbets Field" tells you
           nothing if you did not already know it was in Brooklyn, which is
           exactly what the question was asking. -->
      <p class="hint answer" *ngIf="revealed && venueName">
        It was {{ venueName }}<span *ngIf="venuePlace">, {{ venuePlace }}</span
        ><span *ngIf="distanceKm !== null">
          — you were {{ distanceKm }} km away</span>.
      </p>
    </div>
  `,
  styleUrls: ['./map-picker.component.scss'],
})
export class MapPickerComponent implements AfterViewInit, OnDestroy {
  @ViewChild('canvas') canvas!: ElementRef<HTMLDivElement>;

  /** Set once the answer is locked in, to drop the true pin. */
  @Input() set reveal(value: { lat: number; lng: number } | null) {
    this.truth = value;
    if (value) this.showTruth(value);
  }
  @Input() venueName: string | null = null;
  @Input() venuePlace: string | null = null;
  @Input() disabled = false;

  @Output() picked = new EventEmitter<{ lat: number; lng: number }>();

  guess: { lat: number; lng: number } | null = null;
  revealed = false;
  /** Set when Leaflet could not start, so the failure is visible. */
  failed = false;
  distanceKm: number | null = null;

  private L?: typeof LeafletNS;
  private map?: LeafletNS.Map;
  private guessMarker?: LeafletNS.Marker;
  private truthMarker?: LeafletNS.CircleMarker;
  private line?: LeafletNS.Polyline;
  private truth: { lat: number; lng: number } | null = null;

  /**
   * Leaflet is loaded on demand, not bundled into the initial download.
   *
   * It is 165kB and only one question format in five needs it, so paying for
   * it on the landing page would be charging every visitor for a feature most
   * of them never reach.
   */
  async ngAfterViewInit(): Promise<void> {
    try {
      await this.build();
    } catch (err) {
      // Without this the whole thing failed silently: ngAfterViewInit is async,
      // so a throw here became an unhandled rejection and the only symptom was
      // an empty box. A map question is still answerable without a map — the
      // scoring is a distance computed on the server — so it says so instead.
      this.failed = true;
      console.error('map-picker: could not start Leaflet', err);
    }
  }

  private async build(): Promise<void> {
    // Leaflet is CommonJS, so the namespace this resolves to wraps the real
    // module under `default`. Reading `.map` off the wrapper gives undefined
    // and the call below throws — which is exactly what was happening.
    const mod = (await import('leaflet')) as unknown as
      { default?: typeof LeafletNS } & typeof LeafletNS;
    const L = (this.L = mod.default ?? mod);

    this.map = L.map(this.canvas.nativeElement, {
      center: [25, 5],
      zoom: 1,
      minZoom: 1,
      worldCopyJump: true,
      attributionControl: true,
    });

    // A dark basemap, because the standard OSM one is pale blue and beige and
    // sits on this page like a window cut into a different website. Labels are
    // kept — without place names the world is a silhouette, which is a harder
    // question than the one being asked.
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 12,
      subdomains: 'abcd',
      attribution: '© OpenStreetMap contributors © CARTO',
    }).addTo(this.map);

    this.map.on('click', (e: LeafletNS.LeafletMouseEvent) => {
      if (this.disabled || this.revealed) return;
      this.place(e.latlng.lat, e.latlng.lng);
    });

    // Leaflet measures its container on creation; inside a freshly rendered
    // view that measurement is often zero, which leaves the map a grey box
    // until something else forces a resize.
    setTimeout(() => this.map?.invalidateSize(), 0);

    // A reveal that landed while the import was still in flight.
    if (this.truth) this.showTruth(this.truth);
  }

  ngOnDestroy(): void {
    this.map?.remove();
  }

  private place(lat: number, lng: number): void {
    this.guess = { lat, lng };
    if (!this.map || !this.L) return;

    if (this.guessMarker) this.guessMarker.setLatLng([lat, lng]);
    else this.guessMarker = this.L.marker([lat, lng], { icon: this.pin() })
      .addTo(this.map);

    this.picked.emit(this.guess);
  }

  /**
   * The pin, drawn rather than fetched.
   *
   * Leaflet's default marker is a PNG it locates relative to its own stylesheet,
   * and that path does not survive bundling — so dropping a pin produced a
   * broken-image box and looked for all the world like the tap had failed. It
   * had not; the guess was placed. A div icon has no asset to lose, and this
   * one is the board's amber besides.
   */
  private pin(): LeafletNS.DivIcon {
    return this.L!.divIcon({
      className: 'guess-pin',
      html: '<span class="pin-dot"></span>',
      iconSize: [18, 18],
      iconAnchor: [9, 9],
    });
  }

  private showTruth(truth: { lat: number; lng: number }): void {
    this.revealed = true;
    // The reveal can arrive before the dynamic import resolves; the pin is
    // dropped by ngAfterViewInit in that case.
    if (!this.map || !this.L) return;

    this.truthMarker = this.L.circleMarker([truth.lat, truth.lng], {
      radius: 8,
      color: '#3ddc84',
      fillOpacity: 0.9,
    }).addTo(this.map);

    if (this.guess) {
      this.line = this.L.polyline(
        [[this.guess.lat, this.guess.lng], [truth.lat, truth.lng]],
        { color: '#3ddc84', dashArray: '4 6', weight: 2 },
      ).addTo(this.map);
      this.distanceKm = Math.round(
        this.map.distance([this.guess.lat, this.guess.lng],
                          [truth.lat, truth.lng]) / 1000,
      );
      this.map.fitBounds(this.line.getBounds(), { padding: [40, 40] });
    } else {
      this.map.setView([truth.lat, truth.lng], 5);
    }
  }
}
