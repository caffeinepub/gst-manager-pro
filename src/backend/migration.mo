import Map "mo:core/Map";

// Migration: drop the `accessControlState` field from the old actor.
// The old actor included the MixinAuthorization component which introduced
// `accessControlState`. The new actor no longer uses that component, so we
// consume the field here to explicitly discard it.
module {
  type UserRole = { #admin; #guest; #user };

  type OldActor = {
    accessControlState : {
      var adminAssigned : Bool;
      userRoles : Map.Map<Principal, UserRole>;
    };
  };

  type NewActor = {};

  public func run(_old : OldActor) : NewActor {
    // Explicitly consume accessControlState (dropped intentionally).
    // All other stable fields are inherited automatically.
    {};
  };
};
