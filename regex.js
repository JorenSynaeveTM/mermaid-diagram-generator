// Regular expressions used to parse a C# file.

const classReStr =
  "^(public|private|protected|internal) *(abstract|static)? (class|interface) [A-z]+ *(: ( *[A-z]+,?)+)?$";

const methodReStr =
  "^(protected|public|private|internal) *(static (?!class)[<A-z>]+|override (?!class)[A-z]+|abstract (?!class)[A-z]+|virtual (?!class)[A-z]+|(?!class)[A-z]+) [A-z]+ *\\(.*\\) *;?$";

const constructorReStr = (className) =>
  `^ *(public|private|protected|internal) ${className}\\(.*?\\)`;

const propertiesReStr =
  "^ *(public|private|protected|internal) *(static|virtual|override)? *(?!class)[A-z<>]+ [A-z]+ ?(.=.[A-z<>]*)?;?$";

const eventHandlerReStr =
  "^(public|private|protected|internal) event [A-z]+ [A-z]+;$";

// Group 1 matches everything before the parameter list.
// Group 2 matches the arguments, the parentheses aren't included.
const parameterListRe = "^([^(]+)((.*))$";

const singleParameterRe = "([A-z<>]+) ([A-z]+)( = .*)?";

module.exports = {
  classRe: new RegExp(classReStr, "m"),
  classReG: new RegExp(classReStr, "gm"),
  methodRe: new RegExp(methodReStr, "m"),
  methodReG: new RegExp(methodReStr, "gm"),
  constructorRe: (className) => new RegExp(constructorReStr(className), "m"),
  constructorReG: (className) => new RegExp(constructorReStr(className), "mg"),
  propertiesRe: new RegExp(propertiesReStr, "m"),
  propertiesReG: new RegExp(propertiesReStr, "mg"),
  eventHandlerRe: new RegExp(eventHandlerReStr, "m"),
  eventHandlerReG: new RegExp(eventHandlerReStr, "g"),
  parameterListRe: new RegExp(parameterListRe, "m"),
  parameterListReG: new RegExp(parameterListRe, "mg"),
  singleParameterRe: new RegExp(singleParameterRe, "m"),
  singleParameterReG: new RegExp(singleParameterRe, "mg"),
};
