#### Description*

The app crashes after login.

#### Steps to reproduce*

1. \<Step 1\>
1. \<Step 2\>
1. *etc*


#### Requirements*

- \<Requirement 1\>
- \<Requirement 2\>
- *etc*


#### Relevant logs and/or screenshots

```
const helloWorld = () => {
  console.log( 'Hello, World!' );
};
```


#### Suspected Cause

Recent changes to the database caused the JSON returned from the login api call to be malformed.


#### Suspected Code

Line 5 of `/routes/event.js` caused the bug:
https://gitlab.com/loop-crew/loop/blob/develop/routes/event.js#L5

*\* = required*

/label ~Bug
/cc @sjiang1 @Spartee
/assign @dchang2
