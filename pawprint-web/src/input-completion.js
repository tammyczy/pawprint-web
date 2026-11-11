// Do not erase a new message typed while the previous request was in flight.
export function clearSubmittedInput(input, submittedText){
 if(input.value.trim()===submittedText) input.value='';
}
