import {
    css,
    customElement,
    html,
    LitElement,
    property,
    PropertyValues,
    query,
    TemplateResult,
    unsafeCSS
} from "lit-element";
import {ifDefined} from "lit-html/directives/if-defined";
import {i18next, translate} from "@openremote/or-translate";
import {
    AssetAttribute,
    AttributeDescriptor,
    AttributeEvent,
    AttributeRef,
    AttributeValueDescriptor,
    AttributeValueType,
    MetaItemType,
    SharedEvent,
    ValueType
} from "@openremote/model";
import manager, {AssetModelUtil, DefaultColor4, subscribe, Util} from "@openremote/core";
import "@openremote/or-input";
import {InputType, OrInput, OrInputChangedEvent} from "@openremote/or-input";
import "@openremote/or-map";
import {
    getMarkerIconAndColorFromAssetType,
    LngLat,
    MapEventDetail,
    MapGL,
    OrMapClickedEvent,
    Util as MapUtil
} from "@openremote/or-map";

export class OrAttributeInputChangedEvent extends CustomEvent<OrAttributeInputChangedEventDetail> {

    public static readonly NAME = "or-attribute-input-changed";

    constructor(value?: any, previousValue?: any) {
        super(OrAttributeInputChangedEvent.NAME, {
            detail: {
                value: value,
                previousValue: previousValue
            },
            bubbles: true,
            composed: true
        });
    }
}

export interface OrAttributeInputChangedEventDetail {
    value?: any;
    previousValue?: any;
}

declare global {
    export interface HTMLElementEventMap {
        [OrAttributeInputChangedEvent.NAME]: OrAttributeInputChangedEvent;
    }
}

export type AttributeInputCustomProviderResult = ((value: any, timestamp: number | undefined, loading: boolean, sending: boolean, error: boolean) => TemplateResult) | undefined;

export type AttributeInputCustomProvider = (assetType: string | undefined, attribute: AssetAttribute | undefined, attributeDescriptor: AttributeDescriptor | undefined, valueDescriptor: AttributeValueDescriptor | undefined, valueChangeNotifier: (value: any | undefined) => void, readonly: boolean | undefined, disabled: boolean | undefined, label: string | undefined) => AttributeInputCustomProviderResult;

export class CenterControl {
    protected map?: MapGL;
    protected elem?: HTMLElement;
    public pos?: LngLat;

    onAdd(map: MapGL): HTMLElement {
        this.map = map;
        const control = document.createElement("div");
        control.classList.add("mapboxgl-ctrl");
        control.classList.add("mapboxgl-ctrl-group");
        const button = document.createElement("button");
        button.className = "mapboxgl-ctrl-icon mapboxgl-ctrl-geolocate";
        button.addEventListener("click", (ev) => map.flyTo({
            center: this.pos,
            zoom: map.getZoom()
        }));
        control.appendChild(button);
        this.elem = control;
        return control;
    }

    onRemove(map: MapGL) {
        this.map = undefined;
        this.elem = undefined;
    }
}

export const GeoJsonPointInputTemplateProvider: AttributeInputCustomProvider = (assetType, attribute, attributeDescriptor, valueDescriptor, valueChangeNotifier, readonly, disabled, label) => {

    const centerControl = new CenterControl();

    return (value, timestamp, loading, sending, error) => {
        let pos: LngLat | undefined;
        let center: number[] | undefined;
        if (value) {
            pos = MapUtil.getLngLat(value);
            center = pos ? pos.toArray() : undefined;
        }
        centerControl.pos = pos;
        const iconAndColor = getMarkerIconAndColorFromAssetType(assetType);

        const clickHandler = (mapClickDetail: MapEventDetail) => {
            if (!readonly && !disabled && mapClickDetail.doubleClick) {
                const geoJsonPoint = MapUtil.getGeoJSONPoint(mapClickDetail.lngLat);
                if (valueChangeNotifier) {
                    valueChangeNotifier(geoJsonPoint);
                }
            }
        };

        const content = html`
        <style>
            or-map {
                border: #e5e5e5 1px solid;
                margin: 3px 0;
            }
        </style>
        <or-map class="or-map" @or-map-clicked="${(ev: OrMapClickedEvent) => clickHandler(ev.detail)}" .center="${center}" .controls="${[centerControl]}">
            <or-map-marker active .lng="${pos ? pos.lng : undefined}" .lat="${pos ? pos.lat : undefined}" .icon="${iconAndColor ? iconAndColor.icon : undefined}" .activeColor="${iconAndColor ? "#" + iconAndColor.color : undefined}" .color="${iconAndColor ? "#" + iconAndColor.color : undefined}"></or-map-marker>
        </or-map>
    `;

        return getAttributeInputWrapper(content, loading, !!disabled, getHelperText(sending, false, timestamp), label, undefined);
    }
}

export function getAttributeInputWrapper(content: TemplateResult, loading: boolean, disabled: boolean, helperText: string | undefined, label: string | undefined, buttonIcon?: string, valueProvider?: () => any, valueChangeConsumer?: (value: any) => void): TemplateResult {

    if (helperText) {
        content = html`
                    <div id="wrapper-helper">
                        ${label ? html`<div>${label}</div>` : ``}
                        <div id="wrapper-input">${content}</div>
                        <div id="helper-text">${helperText}</div>
                    </div>
                `;
    }

    if (buttonIcon) {
        content = html`
                ${content}
                <or-input id="send-btn" icon="${buttonIcon}" type="button" .disabled="${disabled || loading}" @or-input-changed="${(e: OrInputChangedEvent) => {
            e.stopPropagation();
            if (valueProvider && valueChangeConsumer) {
                valueChangeConsumer(valueProvider())
            }
        }}"></or-input>
            `;
    }

    return html`
            <div id="wrapper" class="${buttonIcon === undefined || buttonIcon ? "no-padding" : "right-padding"}">
                ${content}
                <div id="scrim" class="${ifDefined(loading ? undefined : "hidden")}"><progress class="pure-material-progress-circular"></progress></div>
            </div>
        `;
}

export function getHelperText(sending: boolean, error: boolean, timestamp: number | undefined): string | undefined {
    if (sending) {
        return i18next.t("sending");
    }

    if (error) {
        return i18next.t("sendFailed");
    }

    if (!timestamp) {
        return;
    }

    return i18next.t("updatedWithDate", { date: new Date(timestamp) });
}

const DEFAULT_TIMEOUT = 5000;

// TODO: Add support for attribute not found and attribute deletion/addition
@customElement("or-attribute-input")
export class OrAttributeInput extends subscribe(manager)(translate(i18next)(LitElement)) {

    // language=CSS
    static get styles() {
        return css`
            :host {
                display: inline-block;
            }
            
            #wrapper or-input, #wrapper or-map {
                width: 100%;
            }
            
            #wrapper or-map {
                min-height: 250px;
            }
            
            #wrapper {
                display: flex;
                position: relative;
            }
            
            #wrapper.right-padding {
                padding-right: 48px;
            }
            
            #wrapper-helper {
                display: flex;
                flex: 1;
                flex-direction: column;
            }
            
            #wrapper-input {
                flex: 1;
                display: flex;
            }
            
            #wrapper-input > or-input {
                margin-left: 16px;
            }
            
            /* Copy of mdc text field helper text styles */
            #helper-text {
                margin-left: 16px;
                min-width: 255px;
                color: rgba(0, 0, 0, 0.6);
                font-family: Roboto, sans-serif;
                -webkit-font-smoothing: antialiased;
                font-size: 0.75rem;
                font-weight: 400;
                letter-spacing: 0.0333333em;
            }
            
            #scrim {
                position: absolute;
                left: 0;
                top: 0;
                right: 0;
                bottom: 0;
                background: white;
                opacity: 0.2;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            
            #scrim.hidden {
                display: none;
            }

            #send-btn { 
                flex: 0;
            }
            
            /*  https://codepen.io/finnhvman/pen/bmNdNr  */
            .pure-material-progress-circular {
                -webkit-appearance: none;
                -moz-appearance: none;
                appearance: none;
                box-sizing: border-box;
                border: none;
                border-radius: 50%;
                padding: 0.25em;
                width: 3em;
                height: 3em;
                color: var(--or-app-color4, ${unsafeCSS(DefaultColor4)});
                background-color: transparent;
                font-size: 16px;
                overflow: hidden;
            }

            .pure-material-progress-circular::-webkit-progress-bar {
                background-color: transparent;
            }

            /* Indeterminate */
            .pure-material-progress-circular:indeterminate {
                -webkit-mask-image: linear-gradient(transparent 50%, black 50%), linear-gradient(to right, transparent 50%, black 50%);
                mask-image: linear-gradient(transparent 50%, black 50%), linear-gradient(to right, transparent 50%, black 50%);
                animation: pure-material-progress-circular 6s infinite cubic-bezier(0.3, 0.6, 1, 1);
            }

            :-ms-lang(x), .pure-material-progress-circular:indeterminate {
                animation: none;
            }

            .pure-material-progress-circular:indeterminate::before,
            .pure-material-progress-circular:indeterminate::-webkit-progress-value {
                content: "";
                display: block;
                box-sizing: border-box;
                margin-bottom: 0.25em;
                border: solid 0.25em transparent;
                border-top-color: currentColor;
                border-radius: 50%;
                width: 100% !important;
                height: 100%;
                background-color: transparent;
                animation: pure-material-progress-circular-pseudo 0.75s infinite linear alternate;
            }

            .pure-material-progress-circular:indeterminate::-moz-progress-bar {
                box-sizing: border-box;
                border: solid 0.25em transparent;
                border-top-color: currentColor;
                border-radius: 50%;
                width: 100%;
                height: 100%;
                background-color: transparent;
                animation: pure-material-progress-circular-pseudo 0.75s infinite linear alternate;
            }

            .pure-material-progress-circular:indeterminate::-ms-fill {
                animation-name: -ms-ring;
            }

            @keyframes pure-material-progress-circular {
                0% {
                    transform: rotate(0deg);
                }
                12.5% {
                    transform: rotate(180deg);
                    animation-timing-function: linear;
                }
                25% {
                    transform: rotate(630deg);
                }
                37.5% {
                    transform: rotate(810deg);
                    animation-timing-function: linear;
                }
                50% {
                    transform: rotate(1260deg);
                }
                62.5% {
                    transform: rotate(1440deg);
                    animation-timing-function: linear;
                }
                75% {
                    transform: rotate(1890deg);
                }
                87.5% {
                    transform: rotate(2070deg);
                    animation-timing-function: linear;
                }
                100% {
                    transform: rotate(2520deg);
                }
            }

            @keyframes pure-material-progress-circular-pseudo {
                0% {
                    transform: rotate(-30deg);
                }
                29.4% {
                    border-left-color: transparent;
                }
                29.41% {
                    border-left-color: currentColor;
                }
                64.7% {
                    border-bottom-color: transparent;
                }
                64.71% {
                    border-bottom-color: currentColor;
                }
                100% {
                    border-left-color: currentColor;
                    border-bottom-color: currentColor;
                    transform: rotate(225deg);
                }
            }
        `;
    }

    @property({type: Object, reflect: false})
    public attribute?: AssetAttribute;

    @property({type: Object})
    public attributeRef?: AttributeRef;

    @property({type: Object})
    public attributeDescriptor?: AttributeDescriptor;

    @property({type: Object})
    public attributeValueDescriptor?: AttributeValueDescriptor;

    @property({type: String})
    public assetType?: string;

    @property({type: String})
    public label?: string;

    @property({type: Boolean})
    public disabled?: boolean;

    @property({type: Boolean})
    public readonly?: boolean;

    @property()
    public value?: any;

    @property()
    public inputType?: InputType;

    @property({type: Boolean})
    public hasHelperText?: boolean;

    @property({type: Boolean})
    public disableButton?: boolean;

    @property({type: Boolean})
    public disableSubscribe: boolean = false;

    @property({type: Boolean})
    public disableWrite: boolean = false;

    @property()
    protected _attributeEvent?: AttributeEvent;

    @property()
    protected _writeTimeoutHandler?: number;

    @query("#input")
    protected _attrInput!: OrInput;
    @query("#send-btn")
    protected _sendButton!: OrInput;
    @query("#scrim")
    protected _scrimElem!: HTMLDivElement;

    public customProvider?: AttributeInputCustomProvider;
    public writeTimeout?: number = DEFAULT_TIMEOUT;
    protected _template?: AttributeInputCustomProviderResult;
    protected _attributeDescriptor?: AttributeDescriptor;
    protected _attributeValueDescriptor?: AttributeValueDescriptor;
    protected _inputType?: InputType;
    protected _step?: number;
    protected _min?: any;
    protected _max?: any;
    protected _label?: string;
    protected _unit?: string;
    protected _options?: any;
    protected _readonly?: boolean;
    protected _disabled?: boolean;
    protected _showButton?: boolean;
    protected _valueFormat?: string;
    protected _sendError = false;

    public disconnectedCallback() {
        super.disconnectedCallback();
        this._clearWriteTimeout();
    }

    public shouldUpdate(_changedProperties: PropertyValues): boolean {
        const shouldUpdate = super.shouldUpdate(_changedProperties);

        let updateSubscribedRefs = false;
        let updateDescriptors = false;

        if (_changedProperties.has("disableSubscribe")) {
            updateSubscribedRefs = true;
        }

        if (_changedProperties.has("attributeDescriptor")
            || _changedProperties.has("attributeValueDescriptor")
            || _changedProperties.has("assetType")) {
            updateDescriptors = true;
        }

        if (_changedProperties.has("attribute")) {
            const oldAttr = _changedProperties.get("attribute") as AssetAttribute;
            const attr = this.attribute;

            if (oldAttr && attr) {
                const oldValue = oldAttr.value;
                const oldTimestamp = oldAttr.valueTimestamp;

                // Compare attributes ignoring the timestamp and value
                oldAttr.value = attr.value;
                oldAttr.valueTimestamp = attr.valueTimestamp;
                if (Util.objectsEqual(oldAttr, attr)) {
                    // Compare value and timestamp
                    if (!Util.objectsEqual(oldValue, attr.value) || oldTimestamp !== attr.valueTimestamp) {
                        this._onAttributeValueChanged(oldValue, attr.value, attr.valueTimestamp);
                    } else if (_changedProperties.size === 1) {
                        // Only the attribute has 'changed' and we've handled it so don't perform update
                        return false;
                    }
                } else {
                    updateSubscribedRefs = true;
                    updateDescriptors = true;
                }
            }
        }

        if (_changedProperties.has("attributeRef") && !Util.objectsEqual(_changedProperties.get("attributeRef"), this.attributeRef)) {
            updateSubscribedRefs = true;
            updateDescriptors = true;
        }

        if (updateDescriptors) {
            this._updateDescriptors();
        }

        if (updateSubscribedRefs) {
            this._updateSubscribedRefs();
        }

        if (this._template
            && (_changedProperties.has("disabled")
                || _changedProperties.has("readonly")
                || _changedProperties.has("label"))) {
            this._updateTemplate();
        }

        return shouldUpdate;
    }

    protected _updateSubscribedRefs(): void {
        this._attributeEvent = undefined;

        if (this.disableSubscribe) {
            this.attributeRefs = undefined;
        } else {
            const attributeRef = this._getAttributeRef();
            this.attributeRefs = attributeRef ? [attributeRef] : undefined;
        }
    }

    protected _getAttributeRef(): AttributeRef | undefined {
        if (this.attributeRef) {
            return this.attributeRef;
        }
        if (this.attribute) {
            return {
                entityId: this.attribute.assetId!,
                attributeName: this.attribute.name!
            }
        }
    }

    protected _updateDescriptors(): void {

        this._attributeValueDescriptor = undefined;
        this._attributeDescriptor = undefined;

        if (this.attributeDescriptor && this.attributeValueDescriptor) {
            this._attributeDescriptor = this.attributeDescriptor;
            this._attributeValueDescriptor = this.attributeValueDescriptor;
        } else {
            const attributeOrDescriptorOrName = this.attributeDescriptor || (this.attribute ? this.attribute : this.attributeRef ? this.attributeRef.attributeName! : undefined);

            if (!attributeOrDescriptorOrName) {
                this._attributeDescriptor = this.attributeDescriptor;
                this._attributeValueDescriptor = this.attributeValueDescriptor;
            } else {
                const attributeAndValueDescriptors = AssetModelUtil.getAttributeAndValueDescriptors(this.assetType, attributeOrDescriptorOrName);
                this._attributeDescriptor = attributeAndValueDescriptors[0];
                this._attributeValueDescriptor = this.attributeValueDescriptor ? this._attributeValueDescriptor : attributeAndValueDescriptors[1];
            }
        }

        this._updateTemplate();
    }

    protected _updateTemplate(): void {
        this._template = undefined;
        this._inputType = undefined;
        this._step = undefined;
        this._min = undefined;
        this._max = undefined;
        this._label = undefined;
        this._unit = undefined;
        this._options = undefined;
        this._disabled = undefined;
        this._readonly = undefined;
        this._showButton = undefined;
        this._inputType = undefined;
        this._valueFormat = undefined;

        if (this.label) {
            this._label = this.label;
        } else if (this.label !== "" && this.label !== null) {
            const descriptors = AssetModelUtil.getAttributeAndValueDescriptors(this.assetType, this.attribute || this._attributeDescriptor);
            this._label = Util.getAttributeLabel(this.attribute, descriptors[0], descriptors[1], true);
        }
        this._readonly = this.readonly !== undefined ? this.readonly : Util.getMetaValue(MetaItemType.READ_ONLY, this.attribute, this._attributeDescriptor);
        this._disabled = this.disabled;

        if (this.customProvider) {
            this._template = this.customProvider(this.assetType, this.attribute, this._attributeDescriptor, this._attributeValueDescriptor, (v) => this._updateValue(v), this._readonly, this._disabled, this._label);
        }

        if (this._template) {
            return;
        }

        if (this.inputType) {
            this._inputType = this.inputType;
        } else if (this._attributeValueDescriptor) {
            switch (this._attributeValueDescriptor.name) {
                case AttributeValueType.GEO_JSON_POINT.name:
                    this._template = GeoJsonPointInputTemplateProvider(this.assetType, this.attribute, this._attributeDescriptor, this._attributeValueDescriptor, (v) => this._updateValue(v), this._readonly, this._disabled, this._label);
                    return;
                case AttributeValueType.SWITCH_MOMENTARY.name:
                    this._inputType = InputType.BUTTON_MOMENTARY;
                    break;
                default:
                    // Use value type
                    switch (this._attributeValueDescriptor.valueType) {
                        case ValueType.STRING:
                            this._inputType = InputType.TEXT;
                            break;
                        case ValueType.NUMBER:
                            this._inputType = InputType.NUMBER;
                            break;
                        case ValueType.BOOLEAN:
                            this._inputType = InputType.SWITCH;
                            break;
                        default:
                            this._inputType = InputType.JSON;
                            break;
                    }
                    break;
            }
        }

        if (!this._inputType && (this.attribute || this.value)) {
            const currentValue = this.attribute ? this.attribute.value : this.value;

            if (currentValue !== undefined && currentValue !== null) {
                if (typeof currentValue === "number") {
                    this._inputType = InputType.NUMBER;
                } else if (typeof currentValue === "string") {
                    this._inputType = InputType.TEXT;
                } else if (typeof currentValue === "boolean") {
                    this._inputType = InputType.SWITCH;
                } else {
                    this._inputType = InputType.JSON;
                }
            }
        }

        if (this._inputType) {
            this._min = Util.getMetaValue(MetaItemType.RANGE_MIN, this.attribute, this._attributeDescriptor, this._attributeValueDescriptor) as number;
            this._max = Util.getMetaValue(MetaItemType.RANGE_MAX, this.attribute, this._attributeDescriptor, this._attributeValueDescriptor) as number;
            this._unit = Util.getMetaValue(MetaItemType.UNIT_TYPE, this.attribute, this._attributeDescriptor, this._attributeValueDescriptor) as string;
            this._step = Util.getMetaValue(MetaItemType.STEP, this.attribute, this._attributeDescriptor, this._attributeValueDescriptor) as number;
            this._options = Util.getMetaValue(MetaItemType.ALLOWED_VALUES, this.attribute, this._attributeDescriptor);

            if (!this.inputType && this._inputType === InputType.TEXT && this._options && Array.isArray(this._options) && this._options.length > 0) {
                this._inputType = InputType.SELECT;
            }

            if (!this.inputType && this._inputType === InputType.TEXT && Util.getMetaValue(MetaItemType.MULTILINE, this.attribute, this._attributeDescriptor, this._attributeValueDescriptor)) {
                this._inputType = InputType.TEXTAREA;
            }

            if (!this.inputType && this._inputType === InputType.NUMBER && this._min !== undefined && this._max) {
                this._inputType = InputType.RANGE;
            }

            this._valueFormat = Util.getAttributeValueFormat(this.attribute, this._attributeDescriptor, this._attributeValueDescriptor);
            this._showButton = !this._readonly && !this._disabled && !this.disableButton && this.inputTypeSupportsButton() && !!this._getAttributeRef();
        }
    }

    public render() {

        // Check if attribute hasn't been loaded yet or pending write
        const loading = (this.attributeRefs && !this._attributeEvent) || !!this._writeTimeoutHandler;
        let content: TemplateResult | string | undefined = "";

        const value = this.getValue();

        if (this._template) {
            content = this._template(value, this.getTimestamp(), loading, !!this._writeTimeoutHandler, this._sendError);
        } else {

            if (!this._inputType) {
                content = html`<div><or-translate .value="attributeUnsupported"></or-translate></div>`;
            }

            const helperText = this.hasHelperText ? getHelperText(!!this._writeTimeoutHandler, this._sendError, this.getTimestamp()) : undefined;
            const buttonIcon = this._writeTimeoutHandler ? "send-clock" : "send";
            const supportsHelperText = this.inputTypeSupportsHelperText();
            let label = this._label;

            if (helperText && !this.inputTypeSupportsHelperText()) {
                label = undefined;
            }

            content = html`<or-input id="input" .type="${this._inputType}" .label="${label}" .value="${value}" 
                .allowedValues="${this._options}" .min="${this._min}" .max="${this._max}" .format="${this._valueFormat}"
                .options="${this._options}" .readonly="${this._readonly}" .disabled="${this._disabled || loading}" 
                .helperText="${supportsHelperText ? helperText : undefined}" .helperPersistent="${true}" .disableSliderNumberInput="${this._readonly}"
                @keyup="${(e: KeyboardEvent) => {
                    if ((e.code === "Enter" || e.code === "NumpadEnter") && this._inputType !== InputType.JSON && this._inputType !== InputType.TEXTAREA) {
                        this._updateValue(this._attrInput.value);
                    }
                }}" @or-input-changed="${(e: OrInputChangedEvent) => {
                    e.stopPropagation();
                    if (!this._showButton) {
                        this._updateValue(e.detail.value);
                    }
                }}"></or-input>`;

            content = getAttributeInputWrapper(content, loading, !!this._disabled, !supportsHelperText ? helperText : undefined, this._label, this._showButton ? buttonIcon : this.disableButton ? undefined : "", () => this._attrInput.value, (v) => this._updateValue(v));
        }

        return content;
    }

    protected updated(_changedProperties: PropertyValues): void {
        if (_changedProperties.has("_writeTimeoutHandler") && !this._writeTimeoutHandler) {
            if (this._attrInput) {
                this._attrInput.focus();
            }
        }
    }

    protected getValue(): any {
        return this._attributeEvent ? this._attributeEvent.attributeState!.value : this.attribute ? this.attribute.value : this.value;
    }

    protected getTimestamp(): number | undefined {
        return this._attributeEvent ? this._attributeEvent.timestamp : this.attribute ? this.attribute.valueTimestamp : undefined;
    }

    protected inputTypeSupportsButton() {
        return this._inputType === InputType.NUMBER
            || this._inputType === InputType.TELEPHONE
            || this._inputType === InputType.TEXT
            || this._inputType === InputType.PASSWORD
            || this._inputType === InputType.DATE
            || this._inputType === InputType.DATETIME
            || this._inputType === InputType.EMAIL
            || this._inputType === InputType.JSON
            || this._inputType === InputType.MONTH
            || this._inputType === InputType.TEXTAREA
            || this._inputType === InputType.TIME
            || this._inputType === InputType.URL
            || this._inputType === InputType.WEEK;
    }

    protected inputTypeSupportsHelperText() {
        return this.inputTypeSupportsButton()
            || this._inputType === InputType.SELECT;
    }

    /**
     * This is called by asset-mixin
     */
    public _onEvent(event: SharedEvent) {
        if (event.eventType !== "attribute") {
            return;
        }

        const oldValue = this.getValue();
        this._attributeEvent = event as AttributeEvent;
        this._onAttributeValueChanged(oldValue, this._attributeEvent.attributeState!.value, event.timestamp);
    }

    protected _onAttributeValueChanged(oldValue: any, newValue: any, timestamp?: number) {
        if (this.attribute) {
            this.attribute.value = newValue;
            this.attribute.valueTimestamp = timestamp;
        }

        this._clearWriteTimeout();
        this.value = newValue;
        this._sendError = false;
        this.dispatchEvent(new OrAttributeInputChangedEvent(newValue, oldValue));
    }

    protected _updateValue(newValue: any) {
        const oldValue = this.getValue();

        if (this.readonly || this._readonly) {
            return;
        }

        if (this._writeTimeoutHandler) {
            return;
        }

        // If we have an attributeRef then send an update and wait for the updated attribute event to come back through
        // the system or for the attribute property to be updated by a parent control or timeout and reset the value
        const attributeRef = this._getAttributeRef();

        if (attributeRef && !this.disableWrite) {

            super._sendEvent({
                eventType: "attribute",
                attributeState: {
                    attributeRef: attributeRef,
                    value: newValue
                }
            } as AttributeEvent);

            this._writeTimeoutHandler = window.setTimeout(() => this._onWriteTimeout(), this.writeTimeout);
        } else {
            this.value = newValue;
            this.dispatchEvent(new OrAttributeInputChangedEvent(newValue, oldValue));
        }
    }

    protected _clearWriteTimeout() {
        if (this._writeTimeoutHandler) {
            window.clearTimeout(this._writeTimeoutHandler);
        }
        this._writeTimeoutHandler = undefined;
    }

    protected _onWriteTimeout() {
        this._sendError = true;
        if (!this.inputTypeSupportsButton()) {
            // Put the old value back
            this._attrInput.value = this.getValue();
        }
        if (this.hasHelperText) {
            this.requestUpdate();
        }
        this._clearWriteTimeout();
    }
}
