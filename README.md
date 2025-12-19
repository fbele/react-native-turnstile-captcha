# react-native-turnstile-captcha

A drop-in [Cloudflare Turnstile](https://www.cloudflare.com/application-services/products/turnstile/) component for React Native applications.

## How It Works

The package uses `react-native-webview` as a wrapper to render the Cloudflare Turnstile widget. Then the communication between the React Native app and the widget is established by sending messages in both two-way manner.

**IMPORTANT**: The `baseUrl` value must match the `hostname` set in your Turnstile Widget in Cloudflare Dashboard. For example, `baseUrl` is set to "<http://localhost>" by default, so you can set the `hostname` for your development environment in your widget to "localhost".
We recommend using a differerent widget for every hostname.

## Installation

```sh
npm i react-native-turnstile-captcha react-native-webview
```

If you're using Expo in your project, then:

```sh
expo install react-native-webview
npm i react-native-turnstile-captcha
```

## Usage

```jsx
import { useRef } from "react";
import { ReactNativeTurnstile, ReactNativeTurnstileCaptchaHandle } from "react-native-turnstile-captcha";

// ...

// Programmatic access example:
const turnstileCaptchaRef = useRef<ReactNativeTurnstileCaptchaHandle>(null);

// Do some call to your backend and execute token validation
const result = await fetch('/path/to/some/api');
if (!result.ok) {
  throw new Error(`Token validation failed with code ${result.status}`);
  turnstileCaptchaRef.current?.sendCommand("reset");
}


function TurnstileWidget() {
  return (
    <ReactNativeTurnstileCaptcha
      ref={turnstileCaptchaRef}
      siteKey={"your-turnstile-site-key"}
      onSuccess={token => console.log(token)}
      onError={error => console.error(error)}
    />
  );
}
```

Turnstile tokens expire after 5 minutes and the refresh is handled automatically by Cloudfare. You can still handle the token manually by using widget commands.

## Documentation

Here is the full set of arguments that  `ReactNativeTurnstileCaptcha` takes:

| name               | type                                   | description                                                                 |
| ------------------ | -------------------------------------- | --------------------------------------------------------------------------- |
| sitekey            | `string`                               | Your Turnstile sitekey (REQUIRED)                                           |
| action?            | `string`                               | -                                                                           |
| appearance?        | `string`                               | defaults to "always"                                                        |
| baseUrl?           | `string`                               | Base URL (defaults to "<http://localhost>")                                 |
| cData?             | `string`                               | -                                                                           |
| execution?         | `string`                               | defaults to "render"                                                        |
| feedbackEnabled?   | `boolean`                              | defaults to `true`                                                          |
| language?          | `string`                               | defaults to "auto"                                                          |
| refreshExpired?    | `string`                               | defaults to "auto"                                                          |
| refreshTimeout?    | `string`                               | defaults to "auto"                                                          |
| responseField?     | `boolean`                              | controls generation of `<input />` element (default `true`)                 |
| responseFieldName? | `string`                               | set the name of `<input />` element (default "cf-turnstile-response")       |
| ref?               | `ReactNativeTurnstileCaptchaHandle`    | ref to send imperative commands to Turnstile widget                         |
| retry?             | `string`                               | one of "auto", "never" (default "auto")                                     |
| retryInterval?     | `number`                               | interval of retries in ms (default 8000)                                    |
| size?              | `string`                               | one of "compact", "normal" (default "normal")                               |
| style?             | `StyleProp<ViewStyle>`                 | style for Turnstile wrapper container.                                      |
| theme?             | `string`                               | one of "light", "dark", "auto" (default "auto")                             |
| webViewStyle?      | `StyleProp<ViewStyle>`                 | style for Turnstile wrapper (Webview).                                      |

And the following callbacks:

| name                 | arguments | description                                                                                                                                     |
| -------------------- | --------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| onSuccess            | token     | invoked upon success of the challenge (REQUIRED)                                                                                                |
| onAfterInteractive?  | -         | invoked when challenge has left interactive mode                                                                                                |
| onBeforeInteractive? | -         | invoked before the challenge enters interactive mode                                                                                            |
| onError?             | error     | invoked when there is an error, refer to [Client-side errors](https://developers.cloudflare.com/turnstile/troubleshooting/client-side-errors/)  |
| onExpired?           | token     | invoked when the token expires and does not reset the widget                                                                                    |
| onTimeout?           | -         | invoked when the challenge presents but was not solved within a given time                                                                      |

For more details on what each argument does, see the [Cloudflare Documentation](https://developers.cloudflare.com/turnstile/get-started/client-side-rendering/#configurations).
