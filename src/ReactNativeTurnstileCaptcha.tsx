/*
 * MIT License
 *
 * Copyright (c) 2025 Franc Bele @Belteq
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

import React, { forwardRef, useImperativeHandle, useRef, useState } from "react";
import { StyleProp, View, ViewStyle } from "react-native";
import WebView, { WebViewMessageEvent } from "react-native-webview";
import type { SupportedLanguages } from "turnstile-types";

export type ReactNativeTurnstileCaptchaProps = {
  action?: string;
  appearance?: "always" | "execute" | "interaction-only";
  baseUrl?: string;
  cData?: string;
  execution?: "render" | "execute";
  feedbackEnabled?: boolean;
  language?: SupportedLanguages | "auto";
  onAfterInteractive?: () => void;
  onBeforeInteractive?: () => void;
  onError?: (error: string) => void;
  onExpired?: (token: string) => void;
  onSuccess: (token: string) => void;
  onTimeout?: () => void;
  refreshExpired?: "auto" | "manual" | "never";
  refreshTimeout?: "auto" | "manual" | "never";
  responseField?: boolean;
  responseFieldName?: string;
  retry?: "auto" | "never";
  retryInterval?: number;
  siteKey: string;
  size?: "normal" | "flexible" | "compact";
  style?: StyleProp<ViewStyle>;
  theme?: "auto" | "light" | "dark";
  webViewStyle?: StyleProp<ViewStyle>;
};

export type ReactNativeTurnstileCaptchaHandle = {
  sendCommand: (command: "execute" | "remove" | "reset") => void;
};

const ReactNativeTurnstileCaptcha = forwardRef<ReactNativeTurnstileCaptchaHandle, ReactNativeTurnstileCaptchaProps>(
  (props, ref) => {
    const {
      action = "",
      appearance = "always",
      baseUrl = "https://localhost",
      cData = "",
      execution = "render",
      feedbackEnabled = true,
      language = "auto",
      onAfterInteractive,
      onBeforeInteractive,
      onError,
      onExpired,
      onTimeout,
      onSuccess,
      refreshExpired = "auto",
      refreshTimeout = "auto",
      responseField = true,
      responseFieldName = "cf-turnstile-response",
      retry = "auto",
      retryInterval = 8000,
      siteKey,
      size = "normal",
      style,
      theme = "auto",
      webViewStyle,
    } = props;

    if (!siteKey) {
      console.warn("Turnstile Site Key not set.");
      return null;
    }

    const [webViewHeight, setWebViewHeight] = useState(65);
    const webviewRef = useRef<WebView>(null);

    useImperativeHandle(ref, () => ({
      sendCommand(command) {
        webviewRef.current?.injectJavaScript(`
        window.dispatchEvent(new MessageEvent('command', { data: '${command}' }));
        true;   // this is needed to prevent issues on Android
      `);
      },
    }));

    const handleMessage = (event: WebViewMessageEvent) => {
      const data = JSON.parse(event.nativeEvent.data);
      switch (data.type) {
        case "height":
          setWebViewHeight(data.height);
          break;
        case "success":
          onSuccess(data.token);
          break;
        case "error":
          if (onError) onError(data.error);
          break;
        case "expired":
          if (onExpired) onExpired(data.token);
          break;
        case "timeout":
          if (onTimeout) onTimeout();
          break;
        case "before-interactive":
          if (onBeforeInteractive) onBeforeInteractive();
          break;
        case "after-interactive":
          if (onAfterInteractive) onAfterInteractive();
          break;
        default:
          break;
      }
    };

    const injectedJavascript = `
    // micro-optimization to guarantee the DOM is ready even on slow Android devices
    setTimeout(() => {
      const container = document.getElementById('turnstileWidget');

      const postMessage = (payload) => {
        window.ReactNativeWebView.postMessage(JSON.stringify(payload));
      };

      const inboundTurnstileCommand = (event) => {
        const command = event.data;
        switch (command) {
          case 'execute':
            turnstile.execute(container);
            break;
          case 'remove':
            turnstile.remove(container);
            break;
          case 'reset':
            turnstile.reset(container);
            break;
          default:
            break;
        }
      };

      const getContainerHeight = (container, callback) => {
        const observer = new ResizeObserver(entries => {
          const newHeight = entries[0].contentRect.height;
          callback(newHeight);
        });

        observer.observe(container);
      }

      const onTurnstileLoad = () => {
        // Render Turnstile widget
        turnstile.render(container, {
          'sitekey': '${siteKey}',
          'action': '${action}',
          'appearance': '${appearance}',
          'cData': '${cData}',
          'execution': '${execution}',
          'feedback-enabled': ${feedbackEnabled},
          'language': '${language}',
          'refresh-expired': '${refreshExpired}',
          'refresh-timeout': '${refreshTimeout}',
          'response-field': ${responseField},
					'response-field-name': ${responseFieldName},
          'retry': '${retry}',
          'retry-interval': ${retryInterval},
          'size': '${size}',
          'theme': '${theme}',
          'callback': (token) => postMessage({ type: 'success', token }),
          'error-callback': ${onError ? "(error) => postMessage({ type: 'error', error })" : undefined},
          'expired-callback': ${onExpired ? "(token) => postMessage({ type: 'expired', token })" : undefined},
          'timeout-callback': ${onTimeout ? "() => postMessage({ type: 'timeout' })" : undefined},
          'before-interactive-callback': ${onBeforeInteractive ? "() => postMessage({ type: 'before-interactive' })" : undefined},
          'after-interactive-callback': ${onAfterInteractive ? "() => postMessage({ type: 'after-interactive' })" : undefined},
        });

        // Watch for visual render (height change)
        getContainerHeight(container, (height) => {
          postMessage({ type: 'height', height });
        });

        // Listen for inbound commands on Turnstile widget
        window.addEventListener('command', inboundTurnstileCommand);
      };

      // Load Turnstile script dynamically
      (() => {
        const s = document.createElement('script');
        s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
        s.onload = onTurnstileLoad;
        document.head.appendChild(s);
      })();
    }, 50);

    true;   // this is needed to prevent issues on Android
  `;

    return (
      <View style={[$container, { height: webViewHeight }, style]}>
        <WebView
          ref={webviewRef}
          bounces={false}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          injectedJavaScript={injectedJavascript}
          onMessage={handleMessage}
          overScrollMode={"never"}
          scrollEnabled={false}
          style={[$webView, webViewStyle]}
          originWhitelist={[baseUrl, "https://*.cloudflare.com", "about:blank", "about:srcdoc"]}
          source={{
            baseUrl: baseUrl,
            html: `
            <!DOCTYPE html>
            <html>
              <head>
                <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
                <style>
                  html,body {
                    margin:0;
                    padding:0;
                    width:100%;
                    height:100%;
                    display:flex;
                    justify-content:center;
                    align-items:center;
                  }
                </style>
              </head>
              <body>
                <div id="turnstileWidget"></div>
              </body>
            </html>
          `,
          }}
        />
      </View>
    );
  }
);

export default ReactNativeTurnstileCaptcha;

const $container: ViewStyle = {
  width: "100%",
};

const $webView: ViewStyle = {
  backgroundColor: "transparent",
};
