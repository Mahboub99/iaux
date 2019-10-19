import {
  LitElement,
  html,
  css,
  customElement,
  property,
  PropertyValues,
  TemplateResult,
  CSSResult,
} from 'lit-element';

import './section-marker';
import { SectionMarker, SectionMarkerMode } from './section-marker';

@customElement('scrubber-bar')
export default class ScrubberBar extends LitElement {
  @property({ type: Number }) value = 0;

  @property({ type: Number }) min = 0;

  @property({ type: Number }) max = 100;

  @property({ type: Number }) step = 0.1;

  @property({ type: Array }) sectionMarkerPercentages: number[] = [];

  get percentage(): number {
    const delta: number = this.max - this.min;
    const minOffset: number = this._value - this.min;
    return (minOffset / delta) * 100;
  }

  private _userInteracting = false;

  // This is the canonical source for the current value. Since the value can be updated by either the consumer
  // or the user, we need a single place for the actual value. It is non-reactive so we can update it in either
  // scenario without causing a loop of `value` updates.
  private _value: number = 0;

  render(): TemplateResult {
    return html`
      <div class="container">
        ${this.sectionMarkerPercentages.map((markerPercent: number) => {
          return html`
            <section-marker
              data-location=${markerPercent}
              style="left: ${markerPercent}%">
            </section-marker>
          `;
        })}

        <input
          id="slider"
          type="range"
          min=${this.min}
          max=${this.max}
          step=${this.step}
          value=${this.value}
          @mousedown=${this.interactionStarted}
          @mouseup=${this.interactionEnded}
          @touchstart=${this.interactionStarted}
          @touchend=${this.interactionEnded}
          @input=${this.handleSlide}
          @change=${this.handleSlide}
        />

        <div id="webkit-range-input-style"></div>
      </div>
    `;
  }

  updated(changedProperties: PropertyValues): void {
    if (this._userInteracting || !changedProperties.has('value')) { return; }
    this._value = this.value;
    if (this.rangeSlider) {
      this.rangeSlider.value = `${this.value}`;
    }
    this.updateWebkitSliderStyle();
  }

  firstUpdated(): void {
    this.updateWebkitSliderStyle();
    this.updateMarkerFlags();
  }

  private handleSlide(e: Event): void {
    const newValue = (e.target as HTMLInputElement).value;
    this._value = parseFloat(newValue);
    this.updateWebkitSliderStyle();
    this.updateMarkerFlags();
    this.emitChangeEvent();
  }

  private interactionStarted(): void {
    this._userInteracting = true;
    this.dispatchEvent(new Event('userInteractionStarted'));
  }

  private interactionEnded(): void {
    this._userInteracting = false;
    this.dispatchEvent(new Event('userInteractionEnded'));
  }

  private get rangeSlider(): HTMLInputElement | null {
    return this.shadowRoot && (this.shadowRoot.getElementById('slider') as HTMLInputElement);
  }

  private get webkitStyle(): HTMLElement | null {
    return this.shadowRoot && this.shadowRoot.getElementById('webkit-range-input-style');
  }

  private updateWebkitSliderStyle(): void {
    if (!this.webkitStyle) { return; }

    this.webkitStyle.innerHTML = `
      <style>
        input[type=range]::-webkit-slider-runnable-track {
          background: linear-gradient(to right,
            var(--trackFillColor, #3272b6) 0%, var(--trackFillColor, #3272b6) ${this.percentage}%,
            var(--trackColor, rgba(0, 0, 0, 0.1)) ${this.percentage}%, var(--trackColor, rgba(0, 0, 0, 0.1)) 100%);
        }
      </style>
    `;
  }

  private emitChangeEvent(): void {
    const event = new CustomEvent('valuechange', {
      detail: { value: this._value },

    });
    this.dispatchEvent(event);
  }

  private get sortedMarkers(): number[] {
    return this.sectionMarkerPercentages.sort();
  }

  private updateMarkerFlags(): void {
    const currentValue: number = this._value;

    const percentsLessThanValue: number[] = this.sortedMarkers.filter(value => value <= currentValue);
    const percentsGreaterThanValue: number[] = this.sortedMarkers.filter(value => value > currentValue);
    const closestLower = Math.max(...percentsLessThanValue);
    const closestUpper = Math.min(...percentsGreaterThanValue);

    this.sectionMarkerPercentages.forEach(value => {
      if (!this.shadowRoot) { return; }
      const marker: SectionMarker | null = this.shadowRoot.querySelector(`section-marker[data-location="${value}"]`)
      if (!marker) { return; }

      switch (value) {
        case closestLower:
          marker.markerMode = SectionMarkerMode.right;
          break;
        case closestUpper:
          marker.markerMode = SectionMarkerMode.left;
          break;
        default:
          marker.markerMode = SectionMarkerMode.neither;
      }
    });
  }

  static get styles(): CSSResult {
    const scrubberBarHeight = css`var(--scrubberBarHeight, 20px)`;

    const thumbDiameter = css`var(--thumbDiameter, 20px)`;
    const thumbBorderRadius = css`var(--thumbBorderRadius, 50%)`;
    const thumbBorder = css`var(--thumbBorder, 1px solid black)`;
    const thumbColor = css`var(--thumbColor, white)`;

    const trackHeight = css`var(--trackHeight, 10px)`;
    const trackBorderRadius = css`var(--trackBorderRadius, 5px)`;
    const trackBorder = css`var(--trackBorder, 1px solid white)`;
    const trackFillColor = css`var(--trackFillColor, #3272b6)`;
    const trackColor = css`var(--trackColor, rgba(0, 0, 0, 0.1))`;

    const webkitThumbTopMargin = css`var(--webkitThumbTopMargin, -6px)`;

    const commonThumbDefinitions = css`
      background-color: ${thumbColor};
      height: ${thumbDiameter};
      width: ${thumbDiameter};
      border-radius: ${thumbBorderRadius};
      border: ${thumbBorder};
      cursor: pointer;
    `;

    const trackSizeDefinitions = css`
      height: ${trackHeight};
      border-radius: ${trackBorderRadius};
    `;

    const commonTrackDefinitions = css`
      background-color: ${trackColor};
      border: ${trackBorder};
      ${trackSizeDefinitions};
    `;

    return css`
      .container {
        position: relative;
        height: 40px;
      }

      section-marker {
        position: absolute;
        width: 2rem;
        height: 40px;
        transform: translateX(-50%);
      }

      input[type='range'] {
        -webkit-appearance: none;
        height: ${scrubberBarHeight};
        padding: 0;
        width: 100%;
        background: none;
        outline: none;
        position: absolute;
        bottom: 0;
      }

      input[type='range']::-webkit-slider-thumb {
        -webkit-appearance: none;
        box-sizing: content-box;
        margin-top: ${webkitThumbTopMargin};
        ${commonThumbDefinitions}
      }

      input[type='range']::-moz-range-thumb {
        ${commonThumbDefinitions}
      }

      input[type='range']::-ms-thumb {
        /* should come after -webkit- */
        ${commonThumbDefinitions}
        margin-top: 0;
      }

      input[type='range']::-webkit-slider-runnable-track {
        ${commonTrackDefinitions}
      }

      input[type='range']::-moz-range-track {
        ${commonTrackDefinitions}
      }

      input[type='range']::-moz-range-progress {
        background-color: ${trackFillColor};
        ${trackSizeDefinitions};
      }

      input[type='range']::-ms-track {
        /* should come after -webkit- */
        border-color: transparent;
        color: transparent;
        ${commonTrackDefinitions}
      }

      input[type='range']::-ms-fill-lower {
        background-color: ${trackFillColor};
        ${trackSizeDefinitions};
      }

      input[type='range']::-ms-tooltip {
        display: none;
      }
    `;
  }
}
