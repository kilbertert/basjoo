"use strict";(()=>{var y=["zh-CN","en-US","vi-VN"],j="zh-CN",w="basjoo_widget_locale",L={"zh-CN":{languageSelectorLabel:"\u8BED\u8A00",optionZh:"\u4E2D\u6587",optionEn:"English",optionVi:"Ti\u1EBFng Vi\u1EC7t",sendFailed:"\u53D1\u9001\u5931\u8D25\uFF0C\u8BF7\u7A0D\u540E\u91CD\u8BD5",networkError:"\u7F51\u7EDC\u8FDE\u63A5\u5931\u8D25\uFF0C\u8BF7\u68C0\u67E5\u7F51\u7EDC",quotaExceeded:"\u4ECA\u65E5\u6D88\u606F\u5DF2\u8FBE\u4E0A\u9650",takenOverNotice:"\u5DF2\u8F6C\u63A5\u4EBA\u5DE5\u5BA2\u670D\uFF0C\u8BF7\u7B49\u5F85\u56DE\u590D\u3002",inputPlaceholder:"\u8F93\u5165\u60A8\u7684\u95EE\u9898...",messageTooLong:"\u6D88\u606F\u8FC7\u957F\uFF08\u6700\u591A2000\u5B57\u7B26\uFF09",greetingBubble:"\u4F60\u597D\uFF01\u6709\u4EC0\u4E48\u53EF\u4EE5\u5E2E\u60A8\uFF1F",newMessage:"\u65B0\u6D88\u606F",thinking:"\u601D\u8003\u4E2D...",references:"\u53C2\u8003\u6765\u6E90"},"en-US":{languageSelectorLabel:"Language",optionZh:"Chinese",optionEn:"English",optionVi:"Vietnamese",sendFailed:"Send failed, please try again later",networkError:"Network connection failed, please check your connection",quotaExceeded:"Daily message limit reached",takenOverNotice:"Your conversation has been transferred to a human agent. Please wait for their reply.",inputPlaceholder:"Type your question...",messageTooLong:"Message too long (max 2000 characters)",greetingBubble:"Hi! How can I help you?",newMessage:"New message",thinking:"Thinking...",references:"References"},"vi-VN":{languageSelectorLabel:"Ng\xF4n ng\u1EEF",optionZh:"Ti\u1EBFng Trung",optionEn:"Ti\u1EBFng Anh",optionVi:"Ti\u1EBFng Vi\u1EC7t",sendFailed:"G\u1EEDi th\u1EA5t b\u1EA1i, vui l\xF2ng th\u1EED l\u1EA1i sau",networkError:"K\u1EBFt n\u1ED1i m\u1EA1ng th\u1EA5t b\u1EA1i, vui l\xF2ng ki\u1EC3m tra m\u1EA1ng",quotaExceeded:"\u0110\xE3 \u0111\u1EA1t gi\u1EDBi h\u1EA1n tin nh\u1EAFn h\xF4m nay",takenOverNotice:"\u0110\xE3 chuy\u1EC3n ti\u1EBFp cho nh\xE2n vi\xEAn h\u1ED7 tr\u1EE3, vui l\xF2ng \u0111\u1EE3i ph\u1EA3n h\u1ED3i.",inputPlaceholder:"Nh\u1EADp c\xE2u h\u1ECFi c\u1EE7a b\u1EA1n...",messageTooLong:"Tin nh\u1EAFn qu\xE1 d\xE0i (t\u1ED1i \u0111a 2000 k\xFD t\u1EF1)",greetingBubble:"Xin ch\xE0o! T\xF4i c\xF3 th\u1EC3 gi\xFAp g\xEC cho b\u1EA1n?",newMessage:"Tin nh\u1EAFn m\u1EDBi",thinking:"\u0110ang suy ngh\u0129...",references:"Ngu\u1ED3n tham kh\u1EA3o"}};function v(h){return typeof h=="string"&&y.indexOf(h)!==-1}function p(h,e){return L[h][e]}function S(h,e=[]){if(!h)return{content:h,references:[]};let t=[],i=new Set,o=new Map;for(let a of e)a.type!=="url"||typeof a.url!="string"||!/^https?:\/\//.test(a.url)||o.has(a.url)||o.set(a.url,a);let n=a=>{if(i.has(a))return;i.add(a);let d=o.get(a);t.push({title:d?.title?.trim()||a,url:a})};return{content:h.replace(/\[([^\]]+)\]\((#source-(\d+)|https?:\/\/[^\s)]+)\)/g,(a,d,r,l)=>{if(l){let u=Number(l)-1,c=e[u];return c&&c.type==="url"&&c.url&&/^https?:\/\//.test(c.url)&&n(c.url),d}return o.has(r)?(n(r),d):a}),references:t}}var m={agentId:["agentId","agent_id"],apiBase:["apiBase","api_base"],themeColor:["themeColor","theme_color"],welcomeMessage:["welcomeMessage","welcome_message"],language:["language","locale"],position:["position"],theme:["theme"],widgetLocale:["widget_locale","widgetLocale"]};function C(h){if(!h)return"/basjoo-logo.png";try{return new URL("/basjoo-logo.png",`${h}/`).toString()}catch{return"/basjoo-logo.png"}}var k=class{constructor(){this.memoryStore=new Map;this.storageAvailable=null}isAvailable(){if(this.storageAvailable!==null)return this.storageAvailable;try{let e="__storage_test__";return window.localStorage.setItem(e,"test"),window.localStorage.removeItem(e),this.storageAvailable=!0,!0}catch{return this.storageAvailable=!1,!1}}getItem(e){if(this.isAvailable())try{return window.localStorage.getItem(e)}catch{}return this.memoryStore.get(e)??null}setItem(e,t){if(this.isAvailable())try{window.localStorage.setItem(e,t);return}catch{}this.memoryStore.set(e,t)}removeItem(e){if(this.isAvailable())try{window.localStorage.removeItem(e);return}catch{}this.memoryStore.delete(e)}},x=class{constructor(e){this.container=null;this.button=null;this.unreadBadge=null;this.chatWindow=null;this.messages=[];this.sessionId=null;this.isOpen=!1;this.VISITOR_STORAGE_KEY="basjoo_visitor_id";this.effectiveTheme="light";this.originalTitle="";this.titleBlinkInterval=null;this.hasUnread=!1;this.pollIntervalId=null;this.lastMessageId=0;this.isSending=!1;this.streamAbortController=null;this.streamingMessage=null;this.streamingMessageContent=null;this.thinkingIndicator=null;this.thinkingIndicatorText=null;this.thinkingElapsed=0;this.thinkingTimerId=null;this.currentStreamContent="";this.currentStreamSources=[];this._buttonClickListener=null;this._closeBtnClickListener=null;this._sendBtnClickListener=null;this._inputKeypressListener=null;this.widgetLocale=j;this._localeChangeListener=null;let t=this.detectApiBase(e.apiBase);this.hasTitleOverride=typeof e.title=="string"&&e.title.trim().length>0,this.hasWelcomeMessageOverride=typeof e.welcomeMessage=="string"&&e.welcomeMessage.trim().length>0,this.config={agentId:e.agentId,apiBase:t,themeColor:e.themeColor||"",logoUrl:e.logoUrl||C(t),title:e.title||"AI\u52A9\u624B",welcomeMessage:e.welcomeMessage||"\u4F60\u597D\uFF01\u6709\u4EC0\u4E48\u53EF\u4EE5\u5E2E\u52A9\u60A8\u7684\u5417\uFF1F",language:e.language||"auto",position:e.position||"right",theme:e.theme||"auto"},this.STORAGE_KEY=`basjoo_session_${this.config.agentId}`,this.storage=new k,this.sessionId=this.storage.getItem(this.STORAGE_KEY),this.visitorId=this.storage.getItem(this.VISITOR_STORAGE_KEY)||this.generateVisitorId(),this.effectiveTheme=this.getEffectiveTheme();let i=this.storage.getItem(w);this.widgetLocale=v(i)?i:j}generateVisitorId(){let e=`visitor_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,11)}`;return this.storage.setItem(this.VISITOR_STORAGE_KEY,e),e}detectApiBase(e){if(e)try{let n=new URL(e,window.location.href);if((n.protocol==="http:"||n.protocol==="https:")&&n.port==="3000"){let s=`${n.protocol}//${n.hostname}:8000`;return console.info("[Basjoo Widget] Rewriting configured dev apiBase to direct backend:",s),s}return n.toString().replace(/\/$/,"")}catch{return e}let t=document.currentScript;if(t instanceof HTMLScriptElement&&t.src)try{let n=new URL(t.src,window.location.href);return console.info("[Basjoo Widget] Detected API base from current script:",n.origin),n.origin}catch{}let i=document.querySelectorAll("script[src]");for(let n of i){let s=n.getAttribute("src")||"";if(!(!s.includes("sdk.js")&&!s.includes("basjoo")))try{let a=new URL(s,window.location.href);return console.info("[Basjoo Widget] Detected API base from script src:",a.origin),a.origin}catch{}}let o=window.location.port;if(o==="3000"||o==="5173"){let n=`${window.location.protocol}//${window.location.hostname}:8000`;return console.info("[Basjoo Widget] Development mode detected, using:",n),n}return window.location.protocol==="file:"?(console.error("[Basjoo Widget] Cannot determine API base from a local file. Please set apiBase explicitly."),""):(console.warn("[Basjoo Widget] Falling back to window.location.origin. Set apiBase explicitly if the API is hosted elsewhere."),window.location.origin)}getEffectiveTheme(){return this.config.theme==="light"||this.config.theme==="dark"?this.config.theme:typeof window<"u"&&window.matchMedia&&window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"}async loadPublicConfig(){if(!this.config.apiBase){console.warn("[Basjoo Widget] Skipping public config fetch because apiBase could not be determined.");return}try{let e=new URL(`${this.config.apiBase}/api/v1/config:public`);this.config.agentId&&e.searchParams.set("agent_id",this.config.agentId);let t=await fetch(e.toString());if(!t.ok)throw new Error(`HTTP ${t.status}: ${t.statusText}`);let i=await t.json();!this.config.agentId&&i.default_agent_id&&(this.config.agentId=i.default_agent_id),this.config.themeColor=this.config.themeColor||i.widget_color||"#3B82F6",this.hasTitleOverride||(this.config.title=i.widget_title||"AI\u52A9\u624B"),this.hasWelcomeMessageOverride||(this.config.welcomeMessage=i.welcome_message||"\u4F60\u597D\uFF01\u6709\u4EC0\u4E48\u53EF\u4EE5\u5E2E\u52A9\u60A8\u7684\u5417\uFF1F"),this.effectiveTheme=this.getEffectiveTheme()}catch(e){console.warn("[Basjoo Widget] Failed to load public config, using defaults.",e),e instanceof TypeError&&console.warn("[Basjoo Widget] Public config request may be blocked by CORS, network issues, or an incorrect apiBase:",this.config.apiBase)}}async init(){if(!document.body){console.warn("[Basjoo Widget] document.body is not available yet. Call init() after DOMContentLoaded or place the embed code near the end of <body>.");return}if(document.getElementById("basjoo-widget-container")){console.warn("[Basjoo Widget] Initialization skipped because #basjoo-widget-container already exists. Avoid loading or initializing the widget twice on the same page.");return}if(await this.loadPublicConfig(),this.originalTitle=document.title,this.createStyles(),this.createContainer(),this.createButton(),this.createChatWindow(),this.showGreetingBubble(),this.startTitleBlink(),this.sessionId){this.loadHistory();return}this.config.welcomeMessage&&this.addMessage({role:"assistant",content:this.config.welcomeMessage,timestamp:new Date})}showGreetingBubble(){if(!this.button)return;let e=document.createElement("div");e.className="basjoo-greeting-bubble",e.textContent=this.getText("greetingBubble");let t=this.config.position;e.style.position="fixed",e.style.bottom="100px",e.style[t]="24px",e.style.zIndex="9999",document.body.appendChild(e),setTimeout(()=>{e.remove()},5e3)}async loadHistory(){if(this.sessionId){try{let e=await fetch(`${this.config.apiBase}/api/v1/chat/messages?session_id=${encodeURIComponent(this.sessionId)}`);if(!e.ok)throw new Error("Failed to load history");let t=await e.json();if(t&&t.length>0){for(let i of t)this.addMessage({role:i.role==="user"?"user":"assistant",content:i.content,sources:i.sources,timestamp:new Date}),i.id>this.lastMessageId&&(this.lastMessageId=i.id);this.startPolling();return}}catch{}this.sessionId=null,this.storage.removeItem(this.STORAGE_KEY),this.config.welcomeMessage&&this.addMessage({role:"assistant",content:this.config.welcomeMessage,timestamp:new Date})}}startTitleBlink(){if(this.titleBlinkInterval)return;this.hasUnread=!0,this.updateUnreadBadge();let e=!0;this.titleBlinkInterval=window.setInterval(()=>{document.title=e?this.originalTitle:"\u2757 "+this.getText("newMessage"),e=!e},1e3)}stopTitleBlink(){this.titleBlinkInterval&&(clearInterval(this.titleBlinkInterval),this.titleBlinkInterval=null),document.title=this.originalTitle,this.hasUnread=!1,this.updateUnreadBadge()}createStyles(){let e=document.createElement("style");e.id="basjoo-widget-styles";let t=this.effectiveTheme==="dark",i=t?"#1a1a2e":"white",o=t?"#e2e8f0":"#1f2937",n=t?"#94a3b8":"#6b7280",s=t?"rgba(148, 163, 184, 0.2)":"#e5e7eb",a=t?"#0f0f1a":"white",d=t?"#2d2d44":"#f3f4f6",r=t?"rgba(239, 68, 68, 0.2)":"#fef2f2";e.textContent=`
      #basjoo-widget-container, #basjoo-widget-container * {
        box-sizing: border-box;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      }

      #basjoo-widget-button {
        position: fixed;
        bottom: 24px;
        ${this.config.position==="left"?"left":"right"}: 24px;
        width: 60px;
        height: 60px;
        border-radius: 50%;
        background-color: ${this.config.themeColor};
        cursor: pointer;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        display: flex;
        align-items: center;
        justify-content: center;
        transition: transform 0.2s, box-shadow 0.2s;
        z-index: 9999;
      }

      #basjoo-widget-button:hover {
        transform: scale(1.05);
        box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
      }

      #basjoo-widget-button svg {
        width: 30px;
        height: 30px;
        fill: white;
      }

      .basjoo-unread-badge {
        position: absolute;
        top: -4px;
        right: -4px;
        min-width: 20px;
        height: 20px;
        padding: 0 6px;
        border-radius: 10px;
        background: #ef4444;
        color: white;
        font-size: 11px;
        font-weight: 600;
        display: flex;
        align-items: center;
        justify-content: center;
        border: 2px solid white;
      }

      .basjoo-greeting-bubble {
        background: white;
        color: ${o};
        padding: 10px 14px;
        border-radius: 12px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        font-size: 13px;
        line-height: 1.4;
        animation: basjoo-bubble-fadein 0.3s ease-out;
        max-width: 200px;
      }

      .basjoo-greeting-bubble::after {
        content: '';
        position: absolute;
        bottom: -6px;
        ${this.config.position==="left"?"left":"right"}: 30px;
        width: 12px;
        height: 12px;
        background: white;
        transform: rotate(45deg);
        border-bottom: 1px solid ${s};
        border-right: 1px solid ${s};
      }

      @keyframes basjoo-bubble-fadein {
        from {
          opacity: 0;
          transform: translateY(10px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      #basjoo-chat-window {
        position: fixed;
        bottom: 96px;
        ${this.config.position==="left"?"left":"right"}: 24px;
        width: 380px;
        height: 600px;
        max-height: calc(100vh - 120px);
        background: ${i};
        border-radius: 20px;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
        display: flex;
        flex-direction: column;
        overflow: hidden;
        transform: scale(0);
        transform-origin: ${this.config.position==="left"?"bottom left":"bottom right"};
        transition: transform 0.3s ease;
        z-index: 9998;
      }

      #basjoo-chat-window.open {
        transform: scale(1);
      }

      #basjoo-chat-window.closing {
        transform: scale(0);
      }

      .basjoo-header {
        background: linear-gradient(135deg, ${this.config.themeColor} 0%, ${this.adjustColor(this.config.themeColor,-20)} 100%);
        color: white;
        padding: 20px 24px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        flex-shrink: 0;
      }

      .basjoo-header-title {
        display: flex;
        align-items: center;
        gap: 12px;
        font-size: 18px;
        font-weight: 600;
      }

      .basjoo-header-logo {
        width: 32px;
        height: 32px;
        object-fit: contain;
        border-radius: 8px;
        background: rgba(255,255,255,0.2);
        padding: 4px;
        flex-shrink: 0;
      }

      .basjoo-close {
        width: 32px;
        height: 32px;
        border: none;
        background: rgba(255,255,255,0.15);
        border-radius: 8px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background 0.2s;
        color: white;
      }

      .basjoo-close:hover {
        background: rgba(255,255,255,0.25);
      }

      .basjoo-messages {
        flex: 1;
        overflow-y: auto;
        padding: 20px;
        display: flex;
        flex-direction: column;
        gap: 16px;
        background: ${a};
      }

      #basjoo-widget-container .basjoo-message {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        max-width: 85%;
        min-width: 0;
        width: fit-content;
        animation: basjoo-message-fadein 0.3s ease-out;
      }

      #basjoo-widget-container .basjoo-message-user {
        align-self: flex-end;
        align-items: flex-end;
      }

      #basjoo-widget-container .basjoo-message-assistant {
        align-self: flex-start;
        align-items: flex-start;
      }

      #basjoo-widget-container .basjoo-message-content {
        display: block;
        align-self: flex-start;
        width: fit-content;
        max-width: 100%;
        min-width: 0;
        padding: 12px 16px;
        border-radius: 16px;
        font-size: 14px;
        line-height: 1.6;
        white-space: pre-wrap;
        word-break: break-word;
        overflow-wrap: anywhere;
      }

      #basjoo-widget-container .basjoo-message-user .basjoo-message-content {
        align-self: flex-end;
      }

      #basjoo-widget-container .basjoo-message-content > * {
        display: block;
        max-width: 100%;
      }

      #basjoo-widget-container .basjoo-message-content p,
      #basjoo-widget-container .basjoo-message-content ul,
      #basjoo-widget-container .basjoo-message-content ol,
      #basjoo-widget-container .basjoo-message-content pre,
      #basjoo-widget-container .basjoo-message-content blockquote {
        margin: 0 0 10px;
      }

      #basjoo-widget-container .basjoo-message-content p:last-child,
      #basjoo-widget-container .basjoo-message-content ul:last-child,
      #basjoo-widget-container .basjoo-message-content ol:last-child,
      #basjoo-widget-container .basjoo-message-content pre:last-child,
      #basjoo-widget-container .basjoo-message-content blockquote:last-child {
        margin-bottom: 0;
      }

      #basjoo-widget-container .basjoo-message-content ul,
      #basjoo-widget-container .basjoo-message-content ol {
        padding-left: 18px;
      }

      #basjoo-widget-container .basjoo-message-content code {
        font-family: SFMono-Regular, Consolas, Liberation Mono, Menlo, monospace;
        font-size: 12px;
        background: rgba(15, 23, 42, 0.08);
        padding: 1px 4px;
        border-radius: 4px;
      }

      #basjoo-widget-container .basjoo-message-content pre {
        background: #0f172a;
        color: #e2e8f0;
        padding: 10px 12px;
        border-radius: 10px;
        overflow-x: auto;
      }

      #basjoo-widget-container .basjoo-message-content pre code {
        background: transparent;
        padding: 0;
        color: inherit;
      }

      #basjoo-widget-container .basjoo-message-content a {
        color: ${this.adjustColor(this.config.themeColor,-10)};
        text-decoration: underline;
      }

      #basjoo-widget-container .basjoo-message-content blockquote {
        padding-left: 12px;
        border-left: 3px solid rgba(148, 163, 184, 0.4);
        color: ${n};
      }

      #basjoo-widget-container .basjoo-message-user .basjoo-message-content {
        background: ${this.config.themeColor};
        color: white;
        border-bottom-right-radius: 4px;
      }

      #basjoo-widget-container .basjoo-message-user .basjoo-message-content a {
        color: white;
      }

      #basjoo-widget-container .basjoo-message-user .basjoo-message-content code {
        background: rgba(255, 255, 255, 0.18);
        color: white;
      }

      #basjoo-widget-container .basjoo-message-assistant .basjoo-message-content {
        background: ${d};
        color: ${o};
        border-bottom-left-radius: 4px;
      }

      #basjoo-widget-container .basjoo-message-error .basjoo-message-content {
        background: ${r};
        color: ${t?"#fca5a5":"#dc2626"};
        border: 1px solid ${t?"rgba(239,68,68,0.35)":"#fecaca"};
      }

      .basjoo-stream-cursor {
        display: inline-block;
        width: 0.5rem;
        height: 1em;
        margin-left: 0.12rem;
        vertical-align: text-bottom;
        background: ${this.config.themeColor};
        animation: basjoo-cursor-blink 1s steps(1) infinite;
      }

      @keyframes basjoo-cursor-blink {
        0%, 50% { opacity: 1; }
        50.01%, 100% { opacity: 0; }
      }

      .basjoo-loading {
        display: flex;
        gap: 4px;
        padding: 12px 16px !important;
        align-self: flex-start;
        margin-top: 4px !important;
      }

      .basjoo-loading-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: ${n};
        animation: basjoo-bounce 1.4s infinite ease-in-out both;
      }

      .basjoo-loading-dot:nth-child(1) { animation-delay: -0.32s; }
      .basjoo-loading-dot:nth-child(2) { animation-delay: -0.16s; }

      @keyframes basjoo-bounce {
        0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
        40% { transform: scale(1); opacity: 1; }
      }

      .basjoo-input-area {
        padding: 16px 20px 24px 20px !important;
        border-top: 1px solid ${s};
        display: flex;
        gap: 12px;
        background: ${i};
        flex-shrink: 0;
      }

      .basjoo-input {
        flex: 1;
        height: 48px;
        padding: 0 20px 0 20px !important;
        border: 1px solid ${s};
        border-radius: 24px;
        font-size: 14px;
        outline: none;
        transition: all 0.2s;
        background: ${a};
        color: ${o};
        margin-bottom: 8px !important;
        margin-left: 4px !important;
      }

      .basjoo-input::placeholder {
        color: ${n};
      }

      .basjoo-input:focus {
        border-color: ${this.config.themeColor};
        box-shadow: 0 0 0 3px ${this.hexToRgba(this.config.themeColor,.1)};
      }

      .basjoo-send {
        width: 48px;
        height: 48px;
        border: none;
        border-radius: 50%;
        background: ${this.config.themeColor};
        color: white;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s;
        flex-shrink: 0;
      }

      .basjoo-send:hover:not(:disabled) {
        transform: scale(1.05);
        box-shadow: 0 4px 12px ${this.hexToRgba(this.config.themeColor,.3)};
      }

      .basjoo-send:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      .basjoo-send svg {
        width: 20px;
        height: 20px;
        stroke: currentColor;
      }

      .basjoo-error {
        padding: 12px 16px;
        background: ${r};
        color: ${t?"#fca5a5":"#dc2626"};
        font-size: 13px;
        text-align: center;
        border-top: 1px solid ${t?"rgba(239,68,68,0.35)":"#fecaca"};
      }

      #basjoo-widget-container .basjoo-message-time {
        font-size: 11px;
        color: ${n};
        margin-top: 4px;
        padding: 0 4px;
      }

      #basjoo-widget-container .basjoo-message-user .basjoo-message-time {
        text-align: right;
      }

      .basjoo-thinking {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        color: ${n};
        font-size: 12px;
        margin-top: 8px;
      }

      .basjoo-thinking-spinner {
        width: 12px;
        height: 12px;
        border: 2px solid ${this.hexToRgba(this.config.themeColor,.2)};
        border-top-color: ${this.config.themeColor};
        border-radius: 50%;
        animation: basjoo-spin 0.8s linear infinite;
      }

      @keyframes basjoo-spin {
        to { transform: rotate(360deg); }
      }

      @keyframes basjoo-message-fadein {
        from {
          opacity: 0;
          transform: translateY(10px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      /* PR12: language selector (header) */
      .basjoo-sr-only {
        position: absolute;
        width: 1px;
        height: 1px;
        padding: 0;
        margin: -1px;
        overflow: hidden;
        clip: rect(0, 0, 0, 0);
        white-space: nowrap;
        border: 0;
      }
      .basjoo-language-selector-wrap {
        display: inline-flex;
        align-items: center;
        margin: 0 8px;
        flex-shrink: 0;
      }
      .basjoo-language-selector {
        appearance: none;
        -webkit-appearance: none;
        background-color: rgba(255, 255, 255, 0.15);
        background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 12' fill='none' stroke='white' stroke-width='1.5'><polyline points='3,5 6,8 9,5'/></svg>");
        background-repeat: no-repeat;
        background-position: right 8px center;
        background-size: 10px 10px;
        color: white;
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 6px;
        padding: 4px 24px 4px 10px;
        font-size: 12px;
        font-weight: 500;
        font-family: inherit;
        line-height: 1.4;
        cursor: pointer;
        outline: none;
        transition: background-color 0.2s, border-color 0.2s;
      }
      .basjoo-language-selector:hover {
        background-color: rgba(255, 255, 255, 0.25);
        border-color: rgba(255, 255, 255, 0.35);
      }
      .basjoo-language-selector:focus-visible {
        background-color: rgba(255, 255, 255, 0.25);
        border-color: rgba(255, 255, 255, 0.6);
        box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.4);
      }
      .basjoo-language-selector option {
        background: ${i};
        color: ${o};
      }

      @media (max-width: 480px) {
        #basjoo-chat-window {
          width: calc(100vw - 32px);
          height: calc(100vh - 120px);
          max-height: 640px;
          bottom: 88px;
          left: 16px !important;
          right: 16px !important;
        }

        #basjoo-widget-button {
          bottom: 16px;
          ${this.config.position==="left"?"left":"right"}: 16px;
        }
      }
    `,document.head.appendChild(e)}adjustColor(e,t){let i=!1,o=e;o[0]==="#"&&(o=o.slice(1),i=!0);let n=parseInt(o,16),s=(n>>16)+t,a=(n>>8&255)+t,d=(n&255)+t;return s=Math.max(0,Math.min(255,s)),a=Math.max(0,Math.min(255,a)),d=Math.max(0,Math.min(255,d)),`${i?"#":""}${(s<<16|a<<8|d).toString(16).padStart(6,"0")}`}hexToRgba(e,t){let i=e.replace("#","");if(i.length===3){let[d,r,l]=i.split("");i=`${d}${d}${r}${r}${l}${l}`}let o=parseInt(i,16),n=o>>16&255,s=o>>8&255,a=o&255;return`rgba(${n}, ${s}, ${a}, ${t})`}updateUnreadBadge(){if(this.button){if(this.hasUnread){if(!this.unreadBadge){let e=document.createElement("span");e.className="basjoo-unread-badge",e.textContent="1",this.button.appendChild(e),this.unreadBadge=e}return}this.unreadBadge?.remove(),this.unreadBadge=null}}createContainer(){this.container=document.createElement("div"),this.container.id="basjoo-widget-container",document.body.appendChild(this.container)}createButton(){this.button=document.createElement("div"),this.button.id="basjoo-widget-button",this.button.innerHTML=`
      <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
      </svg>
    `,this._buttonClickListener=()=>this.toggle(),this.button.addEventListener("click",this._buttonClickListener),this.container.appendChild(this.button),this.updateUnreadBadge()}createChatWindow(){this.chatWindow=document.createElement("div"),this.chatWindow.id="basjoo-chat-window";let e=this.config.logoUrl?this.sanitizeUrlAttribute(this.config.logoUrl):"",t=this.escapeHtml(this.config.title),i=this.escapeHtml(this.getText("inputPlaceholder"));this.chatWindow.innerHTML=`
      <div class="basjoo-header">
        <div class="basjoo-header-title">
          ${e?`<img src="${e}" class="basjoo-header-logo" alt="">`:""}
          <span>${t}</span>
        </div>
        <button class="basjoo-close">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
      <div class="basjoo-messages"></div>
      <div class="basjoo-input-area">
        <input type="text" class="basjoo-input" placeholder="${i}" maxlength="2000">
        <button class="basjoo-send">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="22" y1="2" x2="11" y2="13"></line>
            <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
          </svg>
        </button>
      </div>
    `;let o=this.chatWindow.querySelector(".basjoo-close");this._closeBtnClickListener=()=>this.close(),o.addEventListener("click",this._closeBtnClickListener);let n=this.chatWindow.querySelector(".basjoo-input"),s=this.chatWindow.querySelector(".basjoo-send");this._sendBtnClickListener=()=>{if(this.isSending)return;let c=n.value.trim();if(c){if(c.length>2e3){this.showError(this.getText("messageTooLong"));return}this.sendMessage(c),n.value=""}},s.addEventListener("click",this._sendBtnClickListener),this._inputKeypressListener=c=>{c.key==="Enter"&&this._sendBtnClickListener?.()},n.addEventListener("keypress",this._inputKeypressListener);let a=this.chatWindow.querySelector(".basjoo-header"),d=a.querySelector(".basjoo-close"),r=document.createElement("select");r.className="basjoo-language-selector",r.setAttribute("data-basjoo-locale-select",""),r.setAttribute("aria-label",p(this.widgetLocale,"languageSelectorLabel"));for(let c of y){let g=document.createElement("option");g.value=c,g.textContent=p(this.widgetLocale,c==="zh-CN"?"optionZh":c==="en-US"?"optionEn":"optionVi"),c===this.widgetLocale&&(g.selected=!0),r.appendChild(g)}this._localeChangeListener=()=>this.setWidgetLocale(r.value),r.addEventListener("change",this._localeChangeListener);let l=document.createElement("label");l.className="basjoo-language-selector-wrap";let u=document.createElement("span");u.className="basjoo-sr-only",u.textContent=p(this.widgetLocale,"languageSelectorLabel"),l.appendChild(u),l.appendChild(r),a.insertBefore(l,d),this.container.appendChild(this.chatWindow)}toggle(){if(this.isOpen){this.close();return}this.open()}open(){this.isOpen=!0,this.chatWindow?.classList.remove("closing"),this.chatWindow?.classList.add("open"),this.stopTitleBlink(),this.updateUnreadBadge();let e=this.chatWindow?.querySelector(".basjoo-input");setTimeout(()=>{e?.focus()},300)}close(){this.isOpen=!1,this.chatWindow?.classList.remove("open"),this.chatWindow?.classList.add("closing")}getRequestLocale(){return this.config.language&&this.config.language!=="auto"?this.config.language:navigator.language||"en-US"}getText(e){return p(this.widgetLocale,e)}setWidgetLocale(e){if(!(!v(e)||e===this.widgetLocale)){this.widgetLocale=e;try{this.storage.setItem(w,e)}catch{}this.applyWidgetLocale()}}applyWidgetLocale(){if(!this.chatWindow)return;let e=this.chatWindow.querySelector(".basjoo-input");e&&(e.placeholder=p(this.widgetLocale,"inputPlaceholder"));let t=this.chatWindow.querySelector("[data-basjoo-locale-select]");t&&t.setAttribute("aria-label",p(this.widgetLocale,"languageSelectorLabel"));let i=this.chatWindow.querySelector(".basjoo-language-selector-wrap .basjoo-sr-only");i&&(i.textContent=p(this.widgetLocale,"languageSelectorLabel"));let o=document.querySelector(".basjoo-greeting-bubble");o&&(o.textContent=p(this.widgetLocale,"greetingBubble"))}escapeHtml(e){return e.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;")}sanitizeUrlAttribute(e){try{let t=new URL(e);if(t.protocol==="http:"||t.protocol==="https:")return this.escapeHtml(e)}catch{}return""}renderMarkdown(e){if(!e)return"";let t=e.replace(/\r\n/g,`
`).split(/\n{2,}/).map(n=>n.trim()).filter(Boolean),i=n=>{let s=this.escapeHtml(n);return s=s.replace(/`([^`]+)`/g,"<code>$1</code>"),s=s.replace(/\*\*([^*]+)\*\*/g,"<strong>$1</strong>"),s=s.replace(/__([^_]+)__/g,"<strong>$1</strong>"),s=s.replace(/(^|[^*])\*([^*]+)\*(?!\*)/g,"$1<em>$2</em>"),s=s.replace(/(^|[^_])_([^_]+)_(?!_)/g,"$1<em>$2</em>"),s=s.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,(a,d,r)=>{let l=d,u=this.sanitizeUrlAttribute(r);return u?`<a href="${u}" target="_blank" rel="noopener noreferrer">${l}</a>`:l}),s};return t.map(n=>{if(/^```/.test(n)&&/```$/.test(n)){let s=n.replace(/^```\w*\n?/,"").replace(/```$/,"");return`<pre><code>${this.escapeHtml(s)}</code></pre>`}if(/^(?:[-*]\s.+\n?)+$/.test(n))return`<ul>${n.split(`
`).map(a=>a.replace(/^[-*]\s+/,"").trim()).filter(Boolean).map(a=>`<li>${i(a)}</li>`).join("")}</ul>`;if(/^(?:\d+\.\s.+\n?)+$/.test(n))return`<ol>${n.split(`
`).map(a=>a.replace(/^\d+\.\s+/,"").trim()).filter(Boolean).map(a=>`<li>${i(a)}</li>`).join("")}</ol>`;if(/^>\s?/.test(n)){let s=n.split(`
`).map(a=>a.replace(/^>\s?/,"")).join("<br>");return`<blockquote>${i(s)}</blockquote>`}if(/^#{1,6}\s/.test(n)){let s=n.replace(/^#{1,6}\s+/,"");return`<p><strong>${i(s)}</strong></p>`}return`<p>${i(n).replace(/\n/g,"<br>")}</p>`}).join("")}updateMessageContent(e,t,i=!1){e.innerHTML=this.renderMarkdown(t)+(i?'<span class="basjoo-stream-cursor"></span>':"")}createMessageElement(e){let t=document.createElement("div");t.className=`basjoo-message basjoo-message-${e.role}`;let i=document.createElement("div");if(i.className="basjoo-message-content",e.role==="assistant"){let n=S(e.content,e.sources),s=n.references.length>0?`

**${this.getText("references")}**
${n.references.map(a=>`- [${a.title}](${a.url})`).join(`
`)}`:"";this.updateMessageContent(i,n.content+s)}else this.updateMessageContent(i,e.content);t.appendChild(i);let o=document.createElement("div");return o.className="basjoo-message-time",o.textContent=e.timestamp.toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"}),t.appendChild(o),t}formatThinkingText(){return`${this.getText("thinking")} ${this.thinkingElapsed}s`}showThinkingIndicator(e=0){this.hideLoading(),this.currentStreamContent.trim()||(this.streamingMessage?.remove(),this.streamingMessage=null,this.streamingMessageContent=null),this.thinkingElapsed=e;let t=this.chatWindow?.querySelector(".basjoo-messages");if(t){if(!this.thinkingIndicator){let i=document.createElement("div");i.className="basjoo-thinking",i.innerHTML=`
        <span class="basjoo-thinking-spinner"></span>
        <span>${this.getText("thinking")}</span>
      `,t.appendChild(i),this.thinkingIndicator=i,this.thinkingIndicatorText=i.querySelector("span:last-child")}this.thinkingIndicatorText&&(this.thinkingIndicatorText.textContent=this.formatThinkingText()),t.scrollTop=t.scrollHeight,this.thinkingTimerId===null&&(this.thinkingTimerId=window.setInterval(()=>{this.thinkingElapsed+=1,this.thinkingIndicatorText&&(this.thinkingIndicatorText.textContent=this.formatThinkingText())},1e3))}}hideThinkingIndicator(){this.thinkingTimerId!==null&&(window.clearInterval(this.thinkingTimerId),this.thinkingTimerId=null),this.thinkingIndicator?.remove(),this.thinkingIndicator=null,this.thinkingIndicatorText=null,this.thinkingElapsed=0}removeStreamingMessage(){this.streamingMessage?.remove(),this.streamingMessage=null,this.streamingMessageContent=null,this.currentStreamContent="",this.currentStreamSources=[]}createStreamingMessage(e=!1){let t=this.chatWindow?.querySelector(".basjoo-messages"),i=document.createElement("div");i.className="basjoo-message basjoo-message-assistant";let o=document.createElement("div");return o.className="basjoo-message-content",this.updateMessageContent(o,this.currentStreamContent,e),i.appendChild(o),t?(t.appendChild(i),t.scrollTop=t.scrollHeight,this.streamingMessage=i,this.streamingMessageContent=o,this.currentStreamContent="",i):(this.streamingMessage=i,this.streamingMessageContent=o,this.currentStreamContent="",i)}appendToStreamingMessage(e){(!this.streamingMessage||!this.streamingMessageContent)&&(this.hideThinkingIndicator(),this.createStreamingMessage()),this.currentStreamContent+=e,this.streamingMessageContent&&this.updateMessageContent(this.streamingMessageContent,this.currentStreamContent,!0);let t=this.chatWindow?.querySelector(".basjoo-messages");t&&(t.scrollTop=t.scrollHeight)}finalizeStreamingMessage(e=[]){if(!this.streamingMessage||!this.streamingMessageContent)return;if(!this.currentStreamContent.trim()){this.removeStreamingMessage();return}this.streamingMessage.querySelector(".basjoo-stream-cursor")?.remove(),this.currentStreamSources=e;let i=S(this.currentStreamContent,e),o=i.references.length>0?`

**${this.getText("references")}**
${i.references.map(a=>`- [${a.title}](${a.url})`).join(`
`)}`:"",n=i.content+o;this.updateMessageContent(this.streamingMessageContent,n),this.messages.push({role:"assistant",content:n,sources:e,timestamp:new Date});let s=this.chatWindow?.querySelector(".basjoo-messages");s.scrollTop=s.scrollHeight,this.streamingMessage=null,this.streamingMessageContent=null,this.currentStreamContent="",this.currentStreamSources=[]}addMessage(e){this.messages.push(e);let t=this.chatWindow?.querySelector(".basjoo-messages");if(!e.content){console.error("Message content is null or undefined:",e);return}if(!t)return;let i=this.createMessageElement(e);t.appendChild(i),t.scrollTop=t.scrollHeight,e.role==="assistant"&&!this.isOpen&&(this.hasUnread=!0,this.updateUnreadBadge())}showLoading(){let e=this.chatWindow?.querySelector(".basjoo-messages");if(!e)return;let t=document.createElement("div");t.className="basjoo-loading",t.id="basjoo-loading",t.innerHTML=`
      <div class="basjoo-loading-dot"></div>
      <div class="basjoo-loading-dot"></div>
      <div class="basjoo-loading-dot"></div>
    `,e.appendChild(t),e.scrollTop=e.scrollHeight}hideLoading(){this.chatWindow?.querySelector("#basjoo-loading")?.remove()}showError(e){let t=this.chatWindow?.querySelector(".basjoo-messages");if(!t)return;let i=document.createElement("div");i.className="basjoo-error",i.textContent=e,t.appendChild(i),t.scrollTop=t.scrollHeight,setTimeout(()=>i.remove(),5e3)}startPolling(){this.pollIntervalId||(this.pollIntervalId=window.setInterval(()=>this.pollMessages(),3e3))}stopPolling(){this.pollIntervalId&&(clearInterval(this.pollIntervalId),this.pollIntervalId=null)}async pollMessages(){if(this.sessionId)try{let e=await fetch(`${this.config.apiBase}/api/v1/chat/messages?session_id=${encodeURIComponent(this.sessionId)}&after_id=${this.lastMessageId}&role=assistant`);if(!e.ok)return;let t=await e.json();for(let i of t)i.content&&(this.addMessage({role:i.role==="user"?"user":"assistant",content:i.content,sources:i.sources,timestamp:new Date}),this.isOpen||this.startTitleBlink()),i.id>this.lastMessageId&&(this.lastMessageId=i.id)}catch{}}cleanupAfterStreamError(){this.hideLoading(),this.hideThinkingIndicator(),this.removeStreamingMessage()}async consumeStream(e){if(!e.body)throw new Error("Streaming response body is unavailable");let t=e.body.getReader(),i=new TextDecoder,o="",n=!1,s=r=>{if(!r.trim())return;let l="message",u=[];for(let g of r.split(`
`))g.startsWith("event:")?l=g.slice(6).trim():g.startsWith("data:")&&u.push(g.slice(5).trimStart());if(!u.length)return;let c=JSON.parse(u.join(`
`));switch(l){case"sources":this.currentStreamSources=Array.isArray(c.sources)?c.sources:[];break;case"thinking":this.showThinkingIndicator(typeof c.elapsed=="number"?c.elapsed:0);break;case"thinking_done":this.hideThinkingIndicator();break;case"content":{let g=c.content||"";this.appendToStreamingMessage(g);break}case"done":{let g=c;g.session_id&&(this.sessionId=g.session_id,this.storage.setItem(this.STORAGE_KEY,g.session_id),this.startPolling()),typeof g.message_id=="number"&&g.message_id>this.lastMessageId&&(this.lastMessageId=g.message_id),g.taken_over?(this.removeStreamingMessage(),this.addMessage({role:"assistant",content:this.getText("takenOverNotice"),timestamp:new Date})):(this.finalizeStreamingMessage(this.currentStreamSources),this.isOpen||this.startTitleBlink()),n=!0;break}case"error":{let g=c,f=new Error(g.error||"Stream failed");throw g.code&&(f.name=g.code),f}default:break}},a=()=>{let r=o.indexOf(`\r
\r
`),l=o.indexOf(`

`);return r===-1&&l===-1?null:r===-1?{index:l,length:2}:l===-1?{index:r,length:4}:r<l?{index:r,length:4}:{index:l,length:2}},d=9e4;for(;!n;){if(this.streamAbortController?.signal.aborted){t.cancel();return}let r=null;try{let{done:l,value:u}=await Promise.race([t.read(),new Promise((g,f)=>{r=window.setTimeout(()=>f(new Error("Stream read timeout")),d)})]);o+=i.decode(u||new Uint8Array,{stream:!l});let c=a();for(;c;){let g=o.slice(0,c.index);if(o=o.slice(c.index+c.length),s(g.replace(/\r\n/g,`
`)),n)break;c=a()}if(l)break}finally{r!==null&&window.clearTimeout(r)}}if(!n&&(o.trim()&&s(o),!n))throw new Error("Stream ended unexpectedly")}abortStream(){this.streamAbortController?.abort(),this.streamAbortController=null}async sendMessageWithRetry(e){let t=null;for(let i=0;i<=1;i++){this.abortStream(),this.streamAbortController=new AbortController;try{let o=Intl.DateTimeFormat().resolvedOptions().timeZone,n=await fetch(`${this.config.apiBase}/api/v1/chat/stream`,{method:"POST",headers:{"Content-Type":"application/json",Accept:"text/event-stream"},signal:this.streamAbortController.signal,body:JSON.stringify({agent_id:this.config.agentId,message:e,locale:this.getRequestLocale(),widget_locale:this.widgetLocale,session_id:this.sessionId||void 0,visitor_id:this.visitorId,timezone:o})});if(!n.ok){let s=`HTTP ${n.status}: ${n.statusText}`;try{let a=await n.json();s=a.message||a.detail||s}catch{}throw new Error(s)}this.hideLoading(),await this.consumeStream(n);return}catch(o){t=o;let n=String(o?.message||"");if(!(!(this.currentStreamContent.trim().length>0)&&(o instanceof TypeError||n.includes("fetch")||n.includes("Failed to fetch")||n.includes("Stream ended unexpectedly")))||i>=1)throw this.cleanupAfterStreamError(),o;this.cleanupAfterStreamError(),console.warn(`[Basjoo Widget] Stream attempt ${i+1} failed, retrying...`),await new Promise(d=>window.setTimeout(d,1e3)),this.showLoading()}}throw t}async sendMessage(e){if(!this.isSending){this.isSending=!0,this.addMessage({role:"user",content:e,timestamp:new Date}),this.hideLoading(),this.hideThinkingIndicator(),this.removeStreamingMessage(),this.createStreamingMessage(!0);try{await this.sendMessageWithRetry(e)}catch(t){console.error("[Basjoo Widget] Error sending message:",t);let i=this.getText("sendFailed"),o="",n=String(t?.message||"");t instanceof TypeError||n.includes("fetch")?(i=this.getText("networkError"),o=`Request may be blocked by CORS, network connectivity, or an incorrect apiBase. Current apiBase: ${this.config.apiBase||"(not set)"}`):n.includes("429")||n.toLowerCase().includes("quota")?i=this.getText("quotaExceeded"):t?.name==="ORIGIN_NOT_ALLOWED"||n.toLowerCase().includes("widget origin not allowed")?(i=this.getText("sendFailed"),o="Widget request was blocked because the current page origin is not on the allowed domain list."):n.includes("401")&&(o="Authentication failed. Please check the agent configuration and public API access."),this.config.apiBase||(o="apiBase could not be determined. When embedding the widget from a local file, set apiBase explicitly or load the SDK from the target server."),o&&console.error("[Basjoo Widget]",o),this.showError(i)}finally{this.isSending=!1}}}destroy(){this.stopPolling(),this.stopTitleBlink(),this.hideThinkingIndicator(),this.removeStreamingMessage(),this.abortStream(),this.button&&this._buttonClickListener&&this.button.removeEventListener("click",this._buttonClickListener);let e=this.chatWindow?.querySelector(".basjoo-close");e&&this._closeBtnClickListener&&e.removeEventListener("click",this._closeBtnClickListener);let t=this.chatWindow?.querySelector(".basjoo-send");t&&this._sendBtnClickListener&&t.removeEventListener("click",this._sendBtnClickListener);let i=this.chatWindow?.querySelector(".basjoo-input");i&&this._inputKeypressListener&&i.removeEventListener("keypress",this._inputKeypressListener);let o=this.chatWindow?.querySelector("[data-basjoo-locale-select]");o&&this._localeChangeListener&&o.removeEventListener("change",this._localeChangeListener),this._localeChangeListener=null,this.container?.remove(),document.getElementById("basjoo-widget-styles")?.remove()}};window.BasjooWidget=x;function b(h,e){for(let t of e){let i=h.get(t);if(i&&i.trim())return i.trim()}return null}function T(){if(document.currentScript instanceof HTMLScriptElement)return document.currentScript;let h=Array.from(document.querySelectorAll("script[src]"));for(let e=h.length-1;e>=0;e-=1){let t=h[e],i=t.getAttribute("src")||"";if(i.includes("sdk.js"))try{let o=new URL(i,window.location.href);if(b(o.searchParams,m.agentId))return t}catch{continue}}return null}function M(h){let e=h.getAttribute("src")||h.src;if(!e)return null;let t;try{t=new URL(e,window.location.href)}catch{return null}let i=b(t.searchParams,m.agentId);if(!i)return null;let o={agentId:i},n=b(t.searchParams,m.apiBase);n&&(o.apiBase=n);let s=b(t.searchParams,m.themeColor);s&&(o.themeColor=s);let a=b(t.searchParams,m.welcomeMessage);a&&(o.welcomeMessage=a);let d=b(t.searchParams,m.language);d&&(o.language=d);let r=b(t.searchParams,m.position);(r==="left"||r==="right")&&(o.position=r);let l=b(t.searchParams,m.theme);return(l==="light"||l==="dark"||l==="auto")&&(o.theme=l),o}(function(){let e=window,t=T();if(!t)return;let i=M(t);if(!i||e.__basjooWidgetAutoInitScheduled)return;e.__basjooWidgetAutoInitScheduled=!0;try{let n=b(new URL(t.src).searchParams,m.widgetLocale);n&&v(n)&&window.localStorage.setItem(w,n)}catch{}let o=()=>{new x(i).init()};if(document.readyState==="loading"){document.addEventListener("DOMContentLoaded",o,{once:!0});return}o()})();})();
//# sourceMappingURL=basjoo-widget.min.js.map
