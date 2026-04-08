import Nat "mo:core/Nat";
import Int "mo:core/Int";
import Iter "mo:core/Iter";
import Time "mo:core/Time";
import Text "mo:core/Text";
import Map "mo:core/Map";
import Array "mo:core/Array";
import Order "mo:core/Order";
import Runtime "mo:core/Runtime";
import Principal "mo:core/Principal";

import Migration "migration";

(with migration = Migration.run)
actor {
  type Timestamp = Int;
  type NatId = Nat;

  // ─── Shared Types ───────────────────────────────────────────────────────────

  module BusinessProfile {
    public type RegistrationType = {
      #regular;
      #composition;
      #unregistered;
    };

    public type BusinessProfile = {
      businessName : Text;
      gstin : Text;
      registrationType : RegistrationType;
      stateCode : Nat;
      address : Text;
      contactDetails : Text;
    };
  };

  module PartyMaster {
    public type PartyType = {
      #customer;
      #vendor;
      #both;
    };

    public type Party = {
      id : NatId;
      name : Text;
      gstin : Text;
      pan : Text;
      partyType : PartyType;
      stateCode : Int;
      billingAddress : Text;
      shippingAddress : Text;
      email : Text;
      phone : Text;
      isActive : Bool;
    };
  };

  module ItemServiceMaster {
    public type ItemType = {
      #goods;
      #service;
    };

    public type Item = {
      id : NatId;
      name : Text;
      description : Text;
      hsnSacCode : Text;
      itemType : ItemType;
      unit : Nat;
      gstRate : Nat;
      cessPercent : Nat;
      sellingPrice : Nat;
      purchasePrice : Nat;
      openingStock : Nat;
      isActive : Bool;
    };
  };

  module TaxRateMaster {
    public type TaxRate = {
      id : NatId;
      name : Text;
      gstRatePercent : Nat;
      cessPercent : Nat;
      description : Text;
      isRcmApplicable : Bool;
      isExempt : Bool;
    };
  };

  public type UserProfile = {
    name : Text;
    email : Text;
    role : Text;
  };

  // ─── Business Entity (multi-business per user) ──────────────────────────────

  public type BusinessRecord = {
    id : Text;
    name : Text;
    gstin : Text;
    stateCode : Text;
    role : Text;
    businessType : Text;
    address : Text;
    contactDetails : Text;
    fontFamily : Text;
    themePreset : Text;
    primaryColor : Text;
    secondaryColor : Text;
    bgColor : Text;
    textColor : Text;
    createdAt : Int;
    updatedAt : Int;
  };

  // ─── Per-principal data store: Text key -> Text value (JSON encoded) ─────────
  let dataStore = Map.empty<Principal, Map.Map<Text, Text>>();

  // Helper: get or create the user's data map
  func getUserMap(user : Principal) : Map.Map<Text, Text> {
    switch (dataStore.get(user)) {
      case (?m) { m };
      case null {
        let m = Map.empty<Text, Text>();
        dataStore.add(user, m);
        m;
      };
    };
  };

  // Helper: split a comma-separated index string into an array of non-empty IDs
  func splitIndex(idx : Text) : [Text] {
    idx.split(#char ',').toArray().filter(func(s : Text) : Bool { s != "" });
  };

  // Helper: build a comma-separated index string from an array of IDs
  func joinIndex(ids : [Text]) : Text {
    ids.vals().join(",");
  };

  // ─── Legacy storage (kept for backward compatibility) ───────────────────────
  var businessProfile : ?BusinessProfile.BusinessProfile = null;
  var nextPartyId : NatId = 1;
  var nextItemId : NatId = 1;
  var nextTaxRateId : NatId = 1;

  let parties = Map.empty<NatId, PartyMaster.Party>();
  let items = Map.empty<NatId, ItemServiceMaster.Item>();
  let taxRates = Map.empty<NatId, TaxRateMaster.TaxRate>();
  let userProfiles = Map.empty<Principal, UserProfile>();

  // ─── Sort helpers ───────────────────────────────────────────────────────────

  module Party {
    public func compare(p1 : PartyMaster.Party, p2 : PartyMaster.Party) : Order.Order {
      Nat.compare(p1.id, p2.id);
    };
  };

  module Item {
    public func compare(i1 : ItemServiceMaster.Item, i2 : ItemServiceMaster.Item) : Order.Order {
      Nat.compare(i1.id, i2.id);
    };
  };

  module TaxRate {
    public func compare(t1 : TaxRateMaster.TaxRate, t2 : TaxRateMaster.TaxRate) : Order.Order {
      Nat.compare(t1.id, t2.id);
    };
  };

  // ─── User Profile Management ────────────────────────────────────────────────

  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    userProfiles.get(caller);
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    if (caller != user) {
      Runtime.trap("Unauthorized: Can only view your own profile");
    };
    userProfiles.get(user);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    userProfiles.add(caller, profile);
  };

  // ─── Legacy Business Profile ────────────────────────────────────────────────

  public shared ({ caller }) func setBusinessProfile(profile : BusinessProfile.BusinessProfile) : async () {
    businessProfile := ?profile;
  };

  public query ({ caller }) func getBusinessProfile() : async ?BusinessProfile.BusinessProfile {
    businessProfile;
  };

  // ─── Multi-Business Management (per-user) ───────────────────────────────────

  public shared ({ caller }) func saveBusinessRecord(id : Text, recordJson : Text) : async () {
    let m = getUserMap(caller);
    m.add("biz:" # id, recordJson);
    let existing = switch (m.get("biz:__index")) {
      case (?idx) { idx };
      case null { "" };
    };
    let filtered = if (existing == "") { [] } else {
      splitIndex(existing).filter(func(s : Text) : Bool { s != id });
    };
    m.add("biz:__index", joinIndex(filtered.concat([id])));
  };

  public query ({ caller }) func getBusinessRecord(id : Text) : async ?Text {
    getUserMap(caller).get("biz:" # id);
  };

  public query ({ caller }) func getAllBusinessRecords() : async [Text] {
    let m = getUserMap(caller);
    switch (m.get("biz:__index")) {
      case (?idx) {
        if (idx == "") { return [] };
        let ids = splitIndex(idx);
        ids.filterMap(func(id : Text) : ?Text { m.get("biz:" # id) });
      };
      case null { [] };
    };
  };

  public shared ({ caller }) func deleteBusinessRecord(id : Text) : async () {
    let m = getUserMap(caller);
    m.remove("biz:" # id);
    let existing = switch (m.get("biz:__index")) {
      case (?idx) { idx };
      case null { "" };
    };
    let ids = splitIndex(existing).filter(func(s : Text) : Bool { s != id });
    m.add("biz:__index", joinIndex(ids));
  };

  // ─── Generic Per-Business Entity Storage ────────────────────────────────────

  public shared ({ caller }) func saveEntityRecord(bizId : Text, entityType : Text, id : Text, recordJson : Text) : async () {
    let m = getUserMap(caller);
    let key = bizId # ":" # entityType # ":" # id;
    m.add(key, recordJson);
    let indexKey = bizId # ":" # entityType # ":__index";
    let existing = switch (m.get(indexKey)) {
      case (?idx) { idx };
      case null { "" };
    };
    let filtered = if (existing == "") { [] } else {
      splitIndex(existing).filter(func(s : Text) : Bool { s != id });
    };
    m.add(indexKey, joinIndex(filtered.concat([id])));
  };

  public query ({ caller }) func getEntityRecord(bizId : Text, entityType : Text, id : Text) : async ?Text {
    getUserMap(caller).get(bizId # ":" # entityType # ":" # id);
  };

  public query ({ caller }) func getAllEntityRecords(bizId : Text, entityType : Text) : async [Text] {
    let m = getUserMap(caller);
    let indexKey = bizId # ":" # entityType # ":__index";
    switch (m.get(indexKey)) {
      case (?idx) {
        if (idx == "") { return [] };
        let ids = splitIndex(idx);
        ids.filterMap(func(id : Text) : ?Text { m.get(bizId # ":" # entityType # ":" # id) });
      };
      case null { [] };
    };
  };

  public shared ({ caller }) func deleteEntityRecord(bizId : Text, entityType : Text, id : Text) : async () {
    let m = getUserMap(caller);
    m.remove(bizId # ":" # entityType # ":" # id);
    let indexKey = bizId # ":" # entityType # ":__index";
    let existing = switch (m.get(indexKey)) {
      case (?idx) { idx };
      case null { "" };
    };
    let ids = splitIndex(existing).filter(func(s : Text) : Bool { s != id });
    m.add(indexKey, joinIndex(ids));
  };

  // ─── Settings / Config per business (single JSON blob) ──────────────────────

  public shared ({ caller }) func saveBizConfig(bizId : Text, configKey : Text, value : Text) : async () {
    getUserMap(caller).add(bizId # ":config:" # configKey, value);
  };

  public query ({ caller }) func getBizConfig(bizId : Text, configKey : Text) : async ?Text {
    getUserMap(caller).get(bizId # ":config:" # configKey);
  };

  // ─── Invoice Counter (auto-increment per type per business) ─────────────────

  public shared ({ caller }) func getNextInvoiceNumber(bizId : Text, counterType : Text, prefix : Text) : async Text {
    let m = getUserMap(caller);
    let counterKey = bizId # ":counter:" # counterType;
    let current : Nat = switch (m.get(counterKey)) {
      case (?v) {
        switch (Nat.fromText(v)) {
          case (?n) { n };
          case null { 0 };
        };
      };
      case null { 0 };
    };
    let next = current + 1;
    m.add(counterKey, next.toText());
    let padded = if (next < 10) { "000" # next.toText() }
      else if (next < 100) { "00" # next.toText() }
      else if (next < 1000) { "0" # next.toText() }
      else { next.toText() };
    prefix # padded;
  };

  // ─── Legacy Party Master CRUD ────────────────────────────────────────────────

  public shared ({ caller }) func addParty(party : PartyMaster.Party) : async NatId {
    let id = nextPartyId;
    parties.add(id, { party with id });
    nextPartyId += 1;
    id;
  };

  public shared ({ caller }) func updateParty(id : NatId, updatedParty : PartyMaster.Party) : async () {
    if (not parties.containsKey(id)) {
      Runtime.trap("Party not found");
    };
    parties.add(id, { updatedParty with id });
  };

  public shared ({ caller }) func deleteParty(id : NatId) : async () {
    if (not parties.containsKey(id)) {
      Runtime.trap("Party not found");
    };
    parties.remove(id);
  };

  public query ({ caller }) func getParty(id : NatId) : async ?PartyMaster.Party {
    parties.get(id);
  };

  public query ({ caller }) func getAllParties() : async [PartyMaster.Party] {
    parties.values().toArray().sort();
  };

  // ─── Legacy Item/Service Master CRUD ────────────────────────────────────────

  public shared ({ caller }) func addItem(item : ItemServiceMaster.Item) : async NatId {
    let id = nextItemId;
    items.add(id, { item with id });
    nextItemId += 1;
    id;
  };

  public shared ({ caller }) func updateItem(id : NatId, updatedItem : ItemServiceMaster.Item) : async () {
    if (not items.containsKey(id)) {
      Runtime.trap("Item not found");
    };
    items.add(id, { updatedItem with id });
  };

  public shared ({ caller }) func deleteItem(id : NatId) : async () {
    if (not items.containsKey(id)) {
      Runtime.trap("Item not found");
    };
    items.remove(id);
  };

  public query ({ caller }) func getItem(id : NatId) : async ?ItemServiceMaster.Item {
    items.get(id);
  };

  public query ({ caller }) func getAllItems() : async [ItemServiceMaster.Item] {
    items.values().toArray().sort();
  };

  // ─── Legacy Tax Rate Master CRUD ─────────────────────────────────────────────

  public shared ({ caller }) func addTaxRate(taxRate : TaxRateMaster.TaxRate) : async NatId {
    let id = nextTaxRateId;
    taxRates.add(id, { taxRate with id });
    nextTaxRateId += 1;
    id;
  };

  public shared ({ caller }) func updateTaxRate(id : NatId, updatedTaxRate : TaxRateMaster.TaxRate) : async () {
    if (not taxRates.containsKey(id)) {
      Runtime.trap("Tax rate not found");
    };
    taxRates.add(id, { updatedTaxRate with id });
  };

  public shared ({ caller }) func deleteTaxRate(id : NatId) : async () {
    if (not taxRates.containsKey(id)) {
      Runtime.trap("Tax rate not found");
    };
    taxRates.remove(id);
  };

  public query ({ caller }) func getTaxRate(id : NatId) : async ?TaxRateMaster.TaxRate {
    taxRates.get(id);
  };

  public query ({ caller }) func getAllTaxRates() : async [TaxRateMaster.TaxRate] {
    taxRates.values().toArray().sort();
  };

  // ─── Legacy Cloud Sync (kept for backward compatibility) ─────────────────────
  let cloudData = Map.empty<Principal, Map.Map<Text, Text>>();
  let lastSyncTimes = Map.empty<Principal, Int>();

  public shared ({ caller }) func saveCloudData(key : Text, value : Text) : async () {
    let userMap = switch (cloudData.get(caller)) {
      case (?m) { m };
      case null {
        let m = Map.empty<Text, Text>();
        cloudData.add(caller, m);
        m;
      };
    };
    userMap.add(key, value);
    lastSyncTimes.add(caller, Time.now());
  };

  public query ({ caller }) func getCloudData(key : Text) : async ?Text {
    switch (cloudData.get(caller)) {
      case (?userMap) { userMap.get(key) };
      case null { null };
    };
  };

  public query ({ caller }) func getAllCloudData() : async [(Text, Text)] {
    switch (cloudData.get(caller)) {
      case (?userMap) {
        userMap.entries().toArray();
      };
      case null { [] };
    };
  };

  public query ({ caller }) func getLastSyncTime() : async ?Int {
    lastSyncTimes.get(caller);
  };

  public shared ({ caller }) func deleteCloudData(key : Text) : async () {
    switch (cloudData.get(caller)) {
      case (?userMap) { userMap.remove(key) };
      case null {};
    };
  };
};
