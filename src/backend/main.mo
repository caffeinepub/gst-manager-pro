import Nat "mo:core/Nat";
import Int "mo:core/Int";
import Iter "mo:core/Iter";
import Time "mo:core/Time";
import Text "mo:core/Text";
import Map "mo:core/Map";
import Array "mo:core/Array";
import Order "mo:core/Order";
import Runtime "mo:core/Runtime";
import Result "mo:core/Result";
import List "mo:core/List";
import Option "mo:core/Option";
import Principal "mo:core/Principal";

import MixinAuthorization "authorization/MixinAuthorization";
import AccessControl "authorization/access-control";

actor {
  type Timestamp = Int;
  type NatId = Nat;

  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

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

  var businessProfile : ?BusinessProfile.BusinessProfile = null;
  var nextPartyId : NatId = 1;
  var nextItemId : NatId = 1;
  var nextTaxRateId : NatId = 1;

  let parties = Map.empty<NatId, PartyMaster.Party>();
  let items = Map.empty<NatId, ItemServiceMaster.Item>();
  let taxRates = Map.empty<NatId, TaxRateMaster.TaxRate>();
  let userProfiles = Map.empty<Principal, UserProfile>();

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

  // User Profile Management
  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can access profiles");
    };
    userProfiles.get(caller);
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    if (caller != user and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Can only view your own profile");
    };
    userProfiles.get(user);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can save profiles");
    };
    userProfiles.add(caller, profile);
  };

  // Business Profile Management
  public shared ({ caller }) func setBusinessProfile(profile : BusinessProfile.BusinessProfile) : async () {
    if (not (AccessControl.isAdmin(accessControlState, caller))) {
      Runtime.trap("Unauthorized: Only admins can set business profile");
    };
    businessProfile := ?profile;
  };

  public query ({ caller }) func getBusinessProfile() : async ?BusinessProfile.BusinessProfile {
    // Anyone can view business profile (including guests)
    businessProfile;
  };

  // Party Master CRUD
  public shared ({ caller }) func addParty(party : PartyMaster.Party) : async NatId {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can add parties");
    };
    let id = nextPartyId;
    parties.add(id, { party with id });
    nextPartyId += 1;
    id;
  };

  public shared ({ caller }) func updateParty(id : NatId, updatedParty : PartyMaster.Party) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can update parties");
    };
    if (not parties.containsKey(id)) {
      Runtime.trap("Party not found");
    };
    parties.add(id, { updatedParty with id });
  };

  public shared ({ caller }) func deleteParty(id : NatId) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can delete parties");
    };
    if (not parties.containsKey(id)) {
      Runtime.trap("Party not found");
    };
    parties.remove(id);
  };

  public query ({ caller }) func getParty(id : NatId) : async ?PartyMaster.Party {
    // Anyone can view parties (including guests for viewer role)
    parties.get(id);
  };

  public query ({ caller }) func getAllParties() : async [PartyMaster.Party] {
    // Anyone can view parties (including guests for viewer role)
    parties.values().toArray().sort();
  };

  // Item/Service Master CRUD
  public shared ({ caller }) func addItem(item : ItemServiceMaster.Item) : async NatId {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can add items");
    };
    let id = nextItemId;
    items.add(id, { item with id });
    nextItemId += 1;
    id;
  };

  public shared ({ caller }) func updateItem(id : NatId, updatedItem : ItemServiceMaster.Item) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can update items");
    };
    if (not items.containsKey(id)) {
      Runtime.trap("Item not found");
    };
    items.add(id, { updatedItem with id });
  };

  public shared ({ caller }) func deleteItem(id : NatId) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can delete items");
    };
    if (not items.containsKey(id)) {
      Runtime.trap("Item not found");
    };
    items.remove(id);
  };

  public query ({ caller }) func getItem(id : NatId) : async ?ItemServiceMaster.Item {
    // Anyone can view items (including guests for viewer role)
    items.get(id);
  };

  public query ({ caller }) func getAllItems() : async [ItemServiceMaster.Item] {
    // Anyone can view items (including guests for viewer role)
    items.values().toArray().sort();
  };

  // Tax Rate Master CRUD
  public shared ({ caller }) func addTaxRate(taxRate : TaxRateMaster.TaxRate) : async NatId {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can add tax rates");
    };
    let id = nextTaxRateId;
    taxRates.add(id, { taxRate with id });
    nextTaxRateId += 1;
    id;
  };

  public shared ({ caller }) func updateTaxRate(id : NatId, updatedTaxRate : TaxRateMaster.TaxRate) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can update tax rates");
    };
    if (not taxRates.containsKey(id)) {
      Runtime.trap("Tax rate not found");
    };
    taxRates.add(id, { updatedTaxRate with id });
  };

  public shared ({ caller }) func deleteTaxRate(id : NatId) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can delete tax rates");
    };
    if (not taxRates.containsKey(id)) {
      Runtime.trap("Tax rate not found");
    };
    taxRates.remove(id);
  };

  public query ({ caller }) func getTaxRate(id : NatId) : async ?TaxRateMaster.TaxRate {
    // Anyone can view tax rates (including guests for viewer role)
    taxRates.get(id);
  };

  public query ({ caller }) func getAllTaxRates() : async [TaxRateMaster.TaxRate] {
    // Anyone can view tax rates (including guests for viewer role)
    taxRates.values().toArray().sort();
  };
};
