// App.js

import { Provider } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";
import { store, persistor } from "./src/store";
import AppEntry from "./src/App";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ShopStatusProvider } from "./src/context/ShopStatusContext";

export default function App() {
  return (
    <SafeAreaProvider>
      <Provider store={store}>
        <PersistGate loading={null} persistor={persistor}>
          <ShopStatusProvider>
            <AppEntry />
          </ShopStatusProvider>
        </PersistGate>
      </Provider>
    </SafeAreaProvider>
  );
}