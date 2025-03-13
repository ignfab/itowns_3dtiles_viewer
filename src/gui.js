import * as itowns from 'itowns';
import * as widgets from 'itowns/widgets';

// Recursive function that creates an HTML List from a javascript
// object
// eslint-disable-next-line no-unused-vars
export function createHTMLListFromObject(jsObject) {
    const list = document.createElement('ul');
    // Change the padding (top: 0, right:0, bottom:0 and left:1.5)
    list.style.padding = '0 0 0 1.5rem';
    // For each property of the object
    Object.keys(jsObject).forEach(function _(property) {
        // create item
        const item = document.createElement('li');
        // append property name
        item.appendChild(document.createTextNode(property));

        if (jsObject[property] === null) {
            jsObject[property] = 'null';
        }

        if (typeof jsObject[property] === 'object') {
            // if property value is an object, then recurse to
            // create a list from it
            // eslint-disable-next-line no-unused-vars
            item.appendChild(createHTMLListFromObject(jsObject[property]));
        } else {
            // else append the value of the property to the item
            item.appendChild(document.createTextNode(': '));
            item.appendChild(
                document.createTextNode(jsObject[property]));
        }
        list.appendChild(item);
    });
    return list;
}
