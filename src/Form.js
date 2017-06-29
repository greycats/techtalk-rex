import React, { Component } from 'react'
import { FormGroup, ControlLabel, FormControl } from 'react-bootstrap'

class Form extends Component {
  props: {
    input: Node,
    onSubmit: Function
  }

  handleSubmit(e) {
    e.preventDefault()
    this.props.onSubmit(this.input.value)
  }

  render() {
    return (
      <form onSubmit={this.handleSubmit.bind(this)}>
        <FormGroup>
          <ControlLabel>Enter a keyword:</ControlLabel>
          <FormControl
            type="text"
            inputRef={ref => this.input = ref}
            placeholder="Keyword" />
        </FormGroup>
      </form>
    )
  }
}

export default Form
