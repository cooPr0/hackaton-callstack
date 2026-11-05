import { langStore } from "../i18n/lang";

// Tests assert Polish copy (the design language); node reports en-US, so pin it.
langStore.setState({ lang: "pl" });
